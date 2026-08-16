package com.digitalpersona.onetouch.bridge;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.net.InetSocketAddress;
import java.util.concurrent.Executors;

/**
 * Local HTTP bridge exposing the DigitalPersona fingerprint reader to the laundry-shop
 * web/Electron app, the same way the removed ZKTeco integration exposed a device over HTTP.
 *
 * Serves a single homepage (name + scan), backed by a non-blocking enrollment session --
 * capturing runs continuously in the background (like the SDK's EnrollmentForm sample) and
 * the client polls for progress instead of one call blocking until a timeout:
 *   GET  /                 -> the enrollment test page
 *   POST /api/enroll/start  -> begins a session, response { active, samplesNeeded, message }
 *   GET  /api/enroll/status -> current progress { active, done, success, samplesNeeded, template, message }
 *   POST /api/enroll/cancel -> stops the current session
 */
public class FingerprintBridgeServer {

    public static void main(String[] args) throws IOException {
        int port = args.length > 0 ? Integer.parseInt(args[0]) : 8091;

        // The native capture library delivers scan data through the Windows message pump that
        // AWT/Swing apps (like the SDK's EnrollmentForm sample) run automatically; a plain
        // console app never starts one, so dataAcquired never fires without this window.
        // Some DigitalPersona policies also require the requesting window to have real focus
        // before the sensor will report a scan, so keep this one visible and on top instead of
        // hiding it off-screen.
        final java.awt.Frame messagePump = new java.awt.Frame("DigitalPersona Fingerprint Bridge");
        messagePump.setBounds(100, 100, 320, 120);
        messagePump.add(new java.awt.Label("Keep this window open while scanning fingerprints."));
        messagePump.setAlwaysOnTop(true);
        messagePump.setVisible(true);
        messagePump.toFront();
        messagePump.requestFocus();

        final FingerprintService service = new FingerprintService();

        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/", withCors(new HttpHandler() {
            public void handle(HttpExchange exchange) throws IOException {
                byte[] bytes = EnrollUiPage.HTML.getBytes("UTF-8");
                exchange.getResponseHeaders().set("Content-Type", "text/html; charset=utf-8");
                exchange.sendResponseHeaders(200, bytes.length);
                OutputStream os = exchange.getResponseBody();
                os.write(bytes);
                os.close();
            }
        }));
        server.createContext("/api/enroll/start", withCors(new HttpHandler() {
            public void handle(HttpExchange exchange) throws IOException {
                if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                    writeJson(exchange, 405, "{\"success\":false,\"message\":\"Method not allowed\"}");
                    return;
                }
                readBody(exchange); // no request body fields used, but drain it
                FingerprintService.EnrollStatus status = service.startEnroll();
                writeJson(exchange, 200, toJson(status));
            }
        }));
        server.createContext("/api/enroll/status", withCors(new HttpHandler() {
            public void handle(HttpExchange exchange) throws IOException {
                FingerprintService.EnrollStatus status = service.getEnrollStatus();
                writeJson(exchange, 200, status == null ? "{\"active\":false}" : toJson(status));
            }
        }));
        server.createContext("/api/enroll/cancel", withCors(new HttpHandler() {
            public void handle(HttpExchange exchange) throws IOException {
                service.cancelEnroll();
                writeJson(exchange, 200, "{\"success\":true}");
            }
        }));
        server.createContext("/api/verify-saved", withCors(new HttpHandler() {
            public void handle(HttpExchange exchange) throws IOException {
                if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                    writeJson(exchange, 405, "{\"success\":false,\"message\":\"Method not allowed\"}");
                    return;
                }
                java.util.Map<String, String> request = JsonUtil.parseFlatObject(readBody(exchange));
                String fileName = request.get("templateFile");
                if (fileName == null || fileName.indexOf("..") >= 0 || fileName.indexOf('/') >= 0 || fileName.indexOf('\\') >= 0) {
                    writeJson(exchange, 400, "{\"success\":false,\"message\":\"Invalid template filename\"}");
                    return;
                }
                File templateFile = new File(System.getProperty("fingerprint.scan.dir", "scanImages"), fileName);
                if (!templateFile.isFile()) {
                    writeJson(exchange, 404, "{\"success\":false,\"message\":\"Saved template not found\"}");
                    return;
                }
                FileInputStream input = new FileInputStream(templateFile);
                ByteArrayOutputStream output = new ByteArrayOutputStream();
                byte[] buffer = new byte[1024];
                int count;
                while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                input.close();
                long timeout = request.get("timeoutMs") == null ? 30000 : Long.parseLong(request.get("timeoutMs"));
                FingerprintService.VerifyResult result = service.verify(Base64Util.encode(output.toByteArray()), timeout);
                writeJson(exchange, 200, toJson(result));
            }
        }));

        server.setExecutor(Executors.newCachedThreadPool());
        server.start();
        System.out.println("DigitalPersona fingerprint bridge listening on http://localhost:" + port);
    }

    private static String toJson(FingerprintService.EnrollStatus status) {
        StringBuilder json = new StringBuilder();
        json.append("{\"active\":").append(status.active)
                .append(",\"done\":").append(status.done)
                .append(",\"success\":").append(status.success)
                .append(",\"samplesNeeded\":").append(status.samplesNeeded);
        if (status.template != null) json.append(",\"template\":\"").append(status.template).append('"');
        if (status.message != null) json.append(",\"message\":\"").append(JsonUtil.escape(status.message)).append('"');
        if (status.previewImage != null) json.append(",\"previewImage\":\"").append(status.previewImage).append('"');
        if (status.imagePath != null) json.append(",\"imagePath\":\"").append(JsonUtil.escape(status.imagePath)).append('"');
        if (status.templatePath != null) json.append(",\"templatePath\":\"").append(JsonUtil.escape(status.templatePath)).append('"');
        json.append('}');
        return json.toString();
    }

    private static String toJson(FingerprintService.VerifyResult result) {
        return "{\"success\":" + result.success + ",\"verified\":" + result.verified
                + ",\"falseAcceptRate\":" + result.falseAcceptRate + ",\"message\":\""
                + JsonUtil.escape(result.message) + "\"}";
    }

    private static String readBody(HttpExchange exchange) throws IOException {
        InputStream in = exchange.getRequestBody();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[1024];
        int n;
        while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
        return out.toString("UTF-8");
    }

    private static void writeJson(HttpExchange exchange, int status, String json) throws IOException {
        byte[] bytes = json.getBytes();
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(status, bytes.length);
        OutputStream os = exchange.getResponseBody();
        os.write(bytes);
        os.close();
    }

    /** Adds permissive local CORS headers so the browser/Electron renderer can call this bridge directly. */
    private static HttpHandler withCors(final HttpHandler inner) {
        return new HttpHandler() {
            public void handle(HttpExchange exchange) throws IOException {
                exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
                exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
                exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
                if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                    exchange.sendResponseHeaders(204, -1);
                    return;
                }
                inner.handle(exchange);
            }
        };
    }
}
