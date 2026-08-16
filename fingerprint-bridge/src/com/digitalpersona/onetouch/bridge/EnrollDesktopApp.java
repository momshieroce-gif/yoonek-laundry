package com.digitalpersona.onetouch.bridge;

import com.digitalpersona.onetouch.*;
import com.digitalpersona.onetouch.capture.*;
import com.digitalpersona.onetouch.capture.event.*;
import com.digitalpersona.onetouch.processing.*;
import com.digitalpersona.onetouch.verification.*;

import java.awt.*;
import java.awt.event.*;
import javax.swing.*;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.ArrayList;
import java.util.List;
import java.util.prefs.Preferences;

/**
 * Standalone desktop enrollment tool -- no browser/HTTP involved.
 * Mirrors the SDK's own Enrollment sample (CaptureForm/EnrollmentForm) exactly, since that
 * is the one confirmed to receive real scan data and render the fingerprint image.
 */
public class EnrollDesktopApp extends JFrame {

    private final DPFPCapture capturer = DPFPGlobal.getCaptureFactory().createCapture();
    private DPFPEnrollment enroller;

    private final JTextField nameField = new JTextField();
    private final JButton scanButton = new JButton("Scan Fingerprint");
    private final JButton verifyButton = new JButton("Verify Saved Fingerprint");
    private final JLabel picture = new JLabel();
    private final JLabel statusLabel = new JLabel("Enter a name and click Scan Fingerprint.");

    private boolean scanning = false;
    private boolean verifying = false;
    private boolean verificationSampleHandled = false;

    public EnrollDesktopApp() {
        setTitle("Fingerprint Enrollment");
        setDefaultCloseOperation(WindowConstants.EXIT_ON_CLOSE);

        JPanel top = new JPanel(new BorderLayout(8, 8));
        top.setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));
        JPanel form = new JPanel(new BorderLayout(8, 8));
        form.add(new JLabel("Name:"), BorderLayout.WEST);
        form.add(nameField, BorderLayout.CENTER);
        form.add(scanButton, BorderLayout.EAST);
        top.add(form, BorderLayout.NORTH);

        JPanel actions = new JPanel(new BorderLayout(8, 8));
        actions.add(verifyButton, BorderLayout.WEST);
        actions.add(statusLabel, BorderLayout.CENTER);

        picture.setPreferredSize(new Dimension(240, 280));
        picture.setHorizontalAlignment(SwingConstants.CENTER);
        picture.setBorder(BorderFactory.createLoweredBevelBorder());
        top.add(picture, BorderLayout.CENTER);
        top.add(actions, BorderLayout.SOUTH);

        setContentPane(top);
        pack();
        setSize(320, 420);
        setLocationRelativeTo(null);

        capturer.addReaderStatusListener(new DPFPReaderStatusAdapter() {
            @Override public void readerConnected(DPFPReaderStatusEvent e) {
                SwingUtilities.invokeLater(new Runnable() { public void run() { setStatus("Reader connected."); } });
            }
            @Override public void readerDisconnected(DPFPReaderStatusEvent e) {
                SwingUtilities.invokeLater(new Runnable() { public void run() { setStatus("Reader disconnected."); } });
            }
        });
        capturer.addSensorListener(new DPFPSensorAdapter() {
            @Override public void fingerTouched(DPFPSensorEvent e) {
                SwingUtilities.invokeLater(new Runnable() { public void run() { setStatus("Finger touched -- hold still..."); } });
            }
        });
        capturer.addDataListener(new DPFPDataAdapter() {
            @Override public void dataAcquired(final DPFPDataEvent e) {
                SwingUtilities.invokeLater(new Runnable() { public void run() { onSample(e.getSample()); } });
            }
        });

        scanButton.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent ev) { toggleScan(); }
        });
        verifyButton.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent ev) { startVerification(); }
        });
    }

    private void toggleScan() {
        if (verifying) return;
        if (scanning) {
            capturer.stopCapture();
            scanning = false;
            scanButton.setText("Scan Fingerprint");
            setStatus("Cancelled.");
            return;
        }
        String name = nameField.getText().trim();
        if (name.isEmpty()) {
            setStatus("Please enter a name first.");
            return;
        }
        enroller = DPFPGlobal.getEnrollmentFactory().createEnrollment();
        scanning = true;
        scanButton.setText("Cancel");
        setStatus("Fingerprint samples needed: " + enroller.getFeaturesNeeded());
        capturer.startCapture();
    }

    private void startVerification() {
        if (scanning || verifying) return;
        final List<File> templates = savedTemplates();
        if (templates.isEmpty()) {
            setStatus("No saved fingerprints found.");
            System.out.println("Fingerprint verification: no saved fingerprints found.");
            return;
        }
        verifying = true;
        verificationSampleHandled = false;
        verifyButton.setEnabled(false);
        scanButton.setEnabled(false);
        setStatus("Place a saved fingerprint on the reader.");
        System.out.println("Fingerprint verification started. Waiting for a scan...");
        capturer.startCapture();
    }

    private void onVerificationSample(DPFPSample sample) {
        if (verificationSampleHandled) return;
        verificationSampleHandled = true;

        DPFPFeatureExtraction extractor = DPFPGlobal.getFeatureExtractionFactory().createFeatureExtraction();
        DPFPFeatureSet features;
        try {
            features = extractor.createFeatureSet(sample, DPFPDataPurpose.DATA_PURPOSE_VERIFICATION);
        } catch (DPFPImageQualityException ex) {
            setStatus("Scan quality too poor, scan again.");
            finishVerification();
            return;
        }

        List<File> templates = savedTemplates();
        DPFPVerification verificator = DPFPGlobal.getVerificationFactory().createVerification();
        for (File templateFile : templates) {
            try {
                DPFPTemplate template = DPFPGlobal.getTemplateFactory().createTemplate();
                java.io.FileInputStream input = new java.io.FileInputStream(templateFile);
                byte[] bytes = new byte[(int) templateFile.length()];
                int offset = 0;
                int count;
                while (offset < bytes.length && (count = input.read(bytes, offset, bytes.length - offset)) != -1) {
                    offset += count;
                }
                input.close();
                template.deserialize(bytes);
                DPFPVerificationResult result = verificator.verify(features, template);
                if (result.isVerified()) {
                    String filename = templateFile.getName();
                    String name = nameFromTemplateFile(templateFile);
                        System.out.println("Fingerprint MATCH: file=" + templateFile.getAbsolutePath()
                            + ", filename=" + filename + ", name=" + name
                            + ", FAR=" + result.getFalseAcceptRate());
                        setStatus("Verified file: " + templateFile.getAbsolutePath());
                    finishVerification();
                    return;
                }
            } catch (Exception ex) {
                System.out.println("Could not verify " + templateFile.getName() + ": " + ex.getMessage());
            }
        }
        System.out.println("Fingerprint NO MATCH: checked saved fingerprints " + savedNames(templates) + ".");
        setStatus("No saved fingerprint matched.");
        finishVerification();
    }

    private void finishVerification() {
        capturer.stopCapture();
        verifying = false;
        verifyButton.setEnabled(true);
        scanButton.setEnabled(true);
    }

    private static List<File> savedTemplates() {
        File directory = new File(System.getProperty("fingerprint.scan.dir", "scanImages"));
        File[] files = directory.listFiles(new java.io.FilenameFilter() {
            public boolean accept(File dir, String name) { return name.toLowerCase().endsWith(".fpt"); }
        });
        List<File> result = new ArrayList<File>();
        if (files != null) {
            for (int i = 0; i < files.length; i++) result.add(files[i]);
        }
        return result;
    }

    private static String nameFromTemplateFile(File templateFile) {
        String fileName = templateFile.getName();
        int separator = fileName.indexOf("__");
        int extension = fileName.lastIndexOf(".fpt");
        if (separator >= 0 && extension > separator + 2) {
            return fileName.substring(separator + 2, extension).replace('_', ' ');
        }
        return "Unknown name (legacy template)";
    }

    private static String savedNames(List<File> templates) {
        StringBuilder names = new StringBuilder();
        for (int i = 0; i < templates.size(); i++) {
            if (i > 0) names.append(", ");
            names.append(nameFromTemplateFile(templates.get(i)));
        }
        return names.toString();
    }

    private void onSample(DPFPSample sample) {
        if (verifying) {
            onVerificationSample(sample);
            return;
        }
        picture.setIcon(new ImageIcon(
                DPFPGlobal.getSampleConversionFactory().createImage(sample)
                        .getScaledInstance(picture.getWidth(), picture.getHeight(), Image.SCALE_DEFAULT)));

        DPFPFeatureExtraction extractor = DPFPGlobal.getFeatureExtractionFactory().createFeatureExtraction();
        DPFPFeatureSet features;
        try {
            features = extractor.createFeatureSet(sample, DPFPDataPurpose.DATA_PURPOSE_ENROLLMENT);
        } catch (DPFPImageQualityException ex) {
            setStatus("Scan quality too poor, scan again.");
            return;
        }
        try {
            enroller.addFeatures(features);
        } catch (DPFPImageQualityException ex) {
            setStatus("Scan rejected, scan again.");
            return;
        }

        switch (enroller.getTemplateStatus()) {
            case TEMPLATE_STATUS_READY:
                capturer.stopCapture();
                scanning = false;
                scanButton.setText("Scan Fingerprint");
                String id = nextId();
                String name = nameField.getText().trim();
                String template = Base64Util.encode(enroller.getTemplate().serialize());
                String[] paths = saveArtifacts(sample, enroller.getTemplate().serialize(), name);
                System.out.println("{ id: " + id + ", name: " + name + ", success: true, template: " + template + " }");
                setStatus("Enrolled " + name + " (" + id + "). Saved scan: "
                    + (paths == null ? "failed" : paths[0]));
                break;
            case TEMPLATE_STATUS_FAILED:
                enroller.clear();
                setStatus("Enrollment failed, restart -- fingerprint samples needed: " + enroller.getFeaturesNeeded());
                break;
            default:
                setStatus("Good scan, fingerprint samples needed: " + enroller.getFeaturesNeeded());
                break;
        }
    }

    private void setStatus(String text) {
        statusLabel.setText(text);
    }

    private static String[] saveArtifacts(DPFPSample sample, byte[] templateBytes, String name) {
        File directory = new File(System.getProperty("fingerprint.scan.dir", "scanImages"));
        if (!directory.exists() && !directory.mkdirs()) return null;
        String stamp = new SimpleDateFormat("yyyyMMdd-HHmmss-SSS").format(new Date());
        String filePrefix = stamp + "__" + safeFilePart(name);
        File imageFile = new File(directory, filePrefix + ".png");
        File templateFile = new File(directory, filePrefix + ".fpt");
        try {
            java.awt.Image image = DPFPGlobal.getSampleConversionFactory().createImage(sample);
            java.awt.image.BufferedImage buffered = new java.awt.image.BufferedImage(
                    image.getWidth(null), image.getHeight(null), java.awt.image.BufferedImage.TYPE_INT_RGB);
            java.awt.Graphics2D graphics = buffered.createGraphics();
            graphics.drawImage(image, 0, 0, null);
            graphics.dispose();
            javax.imageio.ImageIO.write(buffered, "png", imageFile);
            FileOutputStream output = new FileOutputStream(templateFile);
            output.write(templateBytes);
            output.close();
            return new String[] { imageFile.getPath(), templateFile.getPath() };
        } catch (IOException ex) {
            imageFile.delete();
            templateFile.delete();
            return null;
        }
    }

    private static String safeFilePart(String value) {
        String safe = value.replaceAll("[^A-Za-z0-9 _-]", "_").trim();
        return safe.length() == 0 ? "Unnamed" : safe.replace(' ', '_');
    }

    private static String nextId() {
        Preferences prefs = Preferences.userNodeForPackage(EnrollDesktopApp.class);
        int n = prefs.getInt("lastId", 0) + 1;
        prefs.putInt("lastId", n);
        return String.format("FP-%04d", n);
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(new Runnable() {
            public void run() { new EnrollDesktopApp().setVisible(true); }
        });
    }
}
