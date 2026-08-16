package com.digitalpersona.onetouch.bridge;

import com.digitalpersona.onetouch.*;
import com.digitalpersona.onetouch.capture.*;
import com.digitalpersona.onetouch.capture.event.*;
import com.digitalpersona.onetouch.processing.*;
import com.digitalpersona.onetouch.verification.*;

import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.locks.ReentrantLock;
import javax.imageio.ImageIO;

/**
 * Wraps the DigitalPersona DPFP capture/enrollment/verification API behind simple
 * blocking calls so an HTTP layer can expose "enroll" and "verify" as request/response.
 *
 * A single DPFPCapture keeps running for the lifetime of the service; each operation
 * installs a temporary sample handler instead of adding/removing native listeners.
 */
public class FingerprintService {

    private interface SampleHandler {
        void handle(DPFPSample sample);
    }

    public static class VerifyResult {
        public boolean success;
        public boolean verified;
        public int falseAcceptRate;
        public String message;
    }

    private final DPFPCapture capturer = DPFPGlobal.getCaptureFactory().createCapture();
    private final ReentrantLock operationLock = new ReentrantLock();
    private final ReentrantLock captureStartLock = new ReentrantLock();
    private final AtomicReference<SampleHandler> activeHandler = new AtomicReference<SampleHandler>();
        private final java.util.concurrent.atomic.AtomicBoolean enrollFinished =
            new java.util.concurrent.atomic.AtomicBoolean(true);
    private volatile boolean readerConnected = false;
    private volatile boolean captureStarted = false;
    private volatile String captureError = null;

    public FingerprintService() {
        capturer.addReaderStatusListener(new DPFPReaderStatusAdapter() {
            @Override public void readerConnected(DPFPReaderStatusEvent e) { readerConnected = true; log("Fingerprint reader connected."); }
            @Override public void readerDisconnected(DPFPReaderStatusEvent e) {
                readerConnected = false;
                captureStarted = false;
                log("Fingerprint reader disconnected.");
            }
        });
        capturer.addSensorListener(new DPFPSensorAdapter() {
            @Override public void fingerTouched(DPFPSensorEvent e) { log("Finger touched the reader."); }
            @Override public void fingerGone(DPFPSensorEvent e) { log("Finger removed from the reader."); }
        });
        capturer.addImageQualityListener(new DPFPImageQualityAdapter() {
            @Override public void onImageQuality(DPFPImageQualityEvent e) {
                log("Image quality: " + e.getFeedback()
                        + (e.getFeedback().equals(DPFPCaptureFeedback.CAPTURE_FEEDBACK_GOOD)
                                ? " (good -- hold still a moment longer if this keeps happening)"
                                : " (poor -- lift and place the finger flat again)"));
            }
        });
        capturer.addDataListener(new DPFPDataAdapter() {
            @Override public void dataAcquired(DPFPDataEvent e) {
                log("Fingerprint sample captured.");
                latestPreviewImage = toBase64Png(e.getSample());
                SampleHandler handler = activeHandler.get();
                if (handler != null) handler.handle(e.getSample());
            }
        });
        tryStartCapture();
    }

    private volatile String latestPreviewImage;

    private static File scanDirectory() {
        return new File(System.getProperty("fingerprint.scan.dir", "scanImages"));
    }

    public String getLatestPreviewImage() {
        return latestPreviewImage;
    }

    /** Mirrors CaptureForm.convertSampleToBitmap -- renders the raw scan for live preview in the UI. */
    private static byte[] toPngBytes(DPFPSample sample) {
        try {
            Image image = DPFPGlobal.getSampleConversionFactory().createImage(sample);
            int w = image.getWidth(null);
            int h = image.getHeight(null);
            if (w <= 0 || h <= 0) return null;
            BufferedImage buffered = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = buffered.createGraphics();
            g.drawImage(image, 0, 0, null);
            g.dispose();
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(buffered, "png", baos);
            return baos.toByteArray();
        } catch (Exception ex) {
            return null;
        }
    }

    private static String toBase64Png(DPFPSample sample) {
        byte[] bytes = toPngBytes(sample);
        return bytes == null ? null : Base64Util.encode(bytes);
    }

    private static String[] saveArtifacts(DPFPSample sample, byte[] templateBytes) {
        File directory = scanDirectory();
        if (!directory.exists() && !directory.mkdirs()) return null;
        String stamp = new SimpleDateFormat("yyyyMMdd-HHmmss-SSS").format(new Date());
        File imageFile = new File(directory, stamp + ".png");
        File templateFile = new File(directory, stamp + ".fpt");
        byte[] imageBytes = toPngBytes(sample);
        if (imageBytes == null) return null;
        try {
            FileOutputStream imageOut = new FileOutputStream(imageFile);
            imageOut.write(imageBytes);
            imageOut.close();
            FileOutputStream templateOut = new FileOutputStream(templateFile);
            templateOut.write(templateBytes);
            templateOut.close();
            return new String[] { imageFile.getPath(), templateFile.getPath() };
        } catch (IOException ex) {
            imageFile.delete();
            templateFile.delete();
            log("Could not save fingerprint scan: " + ex.getMessage());
            return null;
        }
    }

    private static void log(String message) {
        System.out.println("[fingerprint-bridge] " + message);
    }

    /** Attempts to start the capture pipeline; safe to call repeatedly (e.g. reader/service becomes available later). */
    private boolean tryStartCapture() {
        if (captureStarted) return true;
        captureStartLock.lock();
        try {
            if (captureStarted) return true;
            capturer.startCapture();
            captureStarted = true;
            captureError = null;
            return true;
        } catch (Exception ex) {
            captureError = "Fingerprint reader/service unavailable: " + ex.getMessage();
            return false;
        } finally {
            captureStartLock.unlock();
        }
    }

    public boolean isReaderConnected() {
        return readerConnected;
    }

    public boolean isCaptureAvailable() {
        return tryStartCapture();
    }

    public String getCaptureError() {
        return captureError;
    }

    public static class EnrollStatus {
        public volatile boolean active;
        public volatile boolean done;
        public volatile boolean success;
        public volatile int samplesNeeded;
        public volatile String template;
        public volatile String message;
        public volatile String previewImage;
        public volatile String imagePath;
        public volatile String templatePath;
    }

    /**
     * Starts a non-blocking enrollment session, mirroring the SDK's EnrollmentForm sample:
     * capturing keeps running in the background and getEnrollStatus() is polled for progress
     * (samples needed, good/bad scans) until the template is ready, instead of one blocking call.
     */
    public EnrollStatus startEnroll() {
        EnrollStatus status = new EnrollStatus();
        if (!isCaptureAvailable()) {
            status.message = captureError;
            return status;
        }
        if (!operationLock.tryLock()) {
            status.message = "Another fingerprint operation is already in progress.";
            return status;
        }

        final DPFPEnrollment enroller = DPFPGlobal.getEnrollmentFactory().createEnrollment();
        enrollFinished.set(false);
        status.active = true;
        status.samplesNeeded = enroller.getFeaturesNeeded();
        status.message = "Scan the fingerprint on the reader.";
        enrollStatus = status;
        log("Enrollment started, samples needed: " + status.samplesNeeded);

        activeHandler.set(new SampleHandler() {
            public void handle(DPFPSample sample) {
                EnrollStatus current = enrollStatus;
                if (current == null || current.done) return;

                DPFPFeatureSet features = extractFeatures(sample, DPFPDataPurpose.DATA_PURPOSE_ENROLLMENT);
                if (features == null) {
                    current.message = "Scan quality too poor, scan again.";
                    log(current.message);
                    return;
                }
                try {
                    enroller.addFeatures(features);
                } catch (DPFPImageQualityException ex) {
                    current.message = "Scan rejected: " + ex.getMessage();
                    log(current.message);
                    return;
                }
                switch (enroller.getTemplateStatus()) {
                    case TEMPLATE_STATUS_READY:
                        current.success = true;
                        current.done = true;
                        current.samplesNeeded = 0;
                        byte[] templateBytes = enroller.getTemplate().serialize();
                        current.template = Base64Util.encode(templateBytes);
                        String[] paths = saveArtifacts(sample, templateBytes);
                        if (paths != null) {
                            current.imagePath = paths[0];
                            current.templatePath = paths[1];
                            current.message = "Enrollment complete. Scan saved for later verification.";
                        } else {
                            current.message = "Enrollment complete, but the scan could not be saved.";
                        }
                        log("Enrollment complete, template ready.");
                        finishEnroll();
                        break;
                    case TEMPLATE_STATUS_FAILED:
                        enroller.clear();
                        current.samplesNeeded = enroller.getFeaturesNeeded();
                        current.message = "Scan rejected, restarting -- scan again.";
                        log("Enrollment failed, restarting sample collection.");
                        break;
                    default:
                        current.samplesNeeded = enroller.getFeaturesNeeded();
                        current.message = "Good scan accepted.";
                        log("Good scan accepted, samples still needed: " + current.samplesNeeded);
                        break;
                }
            }
        });

        return status;
    }

    public EnrollStatus getEnrollStatus() {
        EnrollStatus current = enrollStatus;
        if (current != null) current.previewImage = latestPreviewImage;
        return current;
    }

    /** Cancels the in-progress enrollment session, if any, and releases the reader for other operations. */
    public void cancelEnroll() {
        EnrollStatus current = enrollStatus;
        if (current != null && current.active && !current.done) {
            current.done = true;
            current.message = "Cancelled.";
            finishEnroll();
        }
    }

    private void finishEnroll() {
        if (enrollFinished.compareAndSet(false, true)) {
            EnrollStatus current = enrollStatus;
            if (current != null) current.active = false;
            activeHandler.set(null);
            operationLock.unlock();
        }
    }

    private volatile EnrollStatus enrollStatus;

    public VerifyResult verify(String base64Template, long timeoutMillis) {
        final VerifyResult result = new VerifyResult();
        if (!isCaptureAvailable()) {
            result.message = captureError;
            return result;
        }
        if (!operationLock.tryLock()) {
            result.message = "Another fingerprint operation is already in progress.";
            return result;
        }
        try {
            final DPFPTemplate template;
            try {
                template = DPFPGlobal.getTemplateFactory().createTemplate();
                template.deserialize(Base64Util.decode(base64Template));
            } catch (Exception ex) {
                result.message = "Invalid fingerprint template.";
                return result;
            }

            final DPFPVerification verificator = DPFPGlobal.getVerificationFactory().createVerification();
            final Object lock = new Object();
            final boolean[] done = { false };

            log("Verification started, waiting for a scan.");
            activeHandler.set(new SampleHandler() {
                public void handle(DPFPSample sample) {
                    DPFPFeatureSet features = extractFeatures(sample, DPFPDataPurpose.DATA_PURPOSE_VERIFICATION);
                    if (features == null) {
                        log("Scan quality too poor, scan again.");
                        return;
                    }
                    DPFPVerificationResult verification = verificator.verify(features, template);
                    synchronized (lock) {
                        result.success = true;
                        result.verified = verification.isVerified();
                        result.falseAcceptRate = verification.getFalseAcceptRate();
                        result.message = result.verified ? "Fingerprint verified." : "Fingerprint did not match.";
                        done[0] = true;
                        lock.notifyAll();
                    }
                    log("Verification result: " + (verification.isVerified() ? "MATCH" : "NO MATCH")
                            + " (FAR=" + verification.getFalseAcceptRate() + ")");
                }
            });

            waitForCompletion(lock, done, timeoutMillis);
            if (!result.success) {
                result.message = "Timed out waiting for a fingerprint scan.";
                log("Verification timed out.");
            }
            return result;
        } finally {
            activeHandler.set(null);
            operationLock.unlock();
        }
    }

    private void waitForCompletion(Object lock, boolean[] done, long timeoutMillis) {
        try {
            synchronized (lock) {
                long deadline = System.currentTimeMillis() + timeoutMillis;
                while (!done[0]) {
                    long remaining = deadline - System.currentTimeMillis();
                    if (remaining <= 0) break;
                    lock.wait(remaining);
                }
            }
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }

    private DPFPFeatureSet extractFeatures(DPFPSample sample, DPFPDataPurpose purpose) {
        DPFPFeatureExtraction extractor = DPFPGlobal.getFeatureExtractionFactory().createFeatureExtraction();
        try {
            return extractor.createFeatureSet(sample, purpose);
        } catch (DPFPImageQualityException e) {
            return null;
        }
    }
}
