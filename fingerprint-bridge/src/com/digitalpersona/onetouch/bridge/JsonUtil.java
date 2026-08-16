package com.digitalpersona.onetouch.bridge;

import java.util.HashMap;
import java.util.Map;

/** Minimal JSON helpers, enough for this bridge's flat request/response bodies (no external deps). */
public class JsonUtil {

    public static String escape(String s) {
        if (s == null) return "";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"': sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                default:
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                    else sb.append(c);
            }
        }
        return sb.toString();
    }

    /** Parses a single-level flat JSON object into a String map (values are read as raw string/number/bool literals). */
    public static Map<String, String> parseFlatObject(String json) {
        Map<String, String> result = new HashMap<String, String>();
        if (json == null) return result;
        String body = json.trim();
        if (body.startsWith("{")) body = body.substring(1);
        if (body.endsWith("}")) body = body.substring(0, body.length() - 1);

        int i = 0;
        int len = body.length();
        while (i < len) {
            while (i < len && (Character.isWhitespace(body.charAt(i)) || body.charAt(i) == ',')) i++;
            if (i >= len || body.charAt(i) != '"') break;
            StringBuilder key = new StringBuilder();
            i++;
            while (i < len && body.charAt(i) != '"') {
                key.append(body.charAt(i));
                i++;
            }
            i++; // closing quote
            while (i < len && (Character.isWhitespace(body.charAt(i)) || body.charAt(i) == ':')) i++;

            String value;
            if (i < len && body.charAt(i) == '"') {
                i++;
                StringBuilder val = new StringBuilder();
                while (i < len && body.charAt(i) != '"') {
                    char c = body.charAt(i);
                    if (c == '\\' && i + 1 < len) {
                        i++;
                        char next = body.charAt(i);
                        if (next == 'n') val.append('\n');
                        else if (next == 't') val.append('\t');
                        else val.append(next);
                    } else {
                        val.append(c);
                    }
                    i++;
                }
                i++; // closing quote
                value = val.toString();
            } else {
                int valStart = i;
                while (i < len && body.charAt(i) != ',' && body.charAt(i) != '}') i++;
                value = body.substring(valStart, i).trim();
            }
            result.put(key.toString(), value);
        }
        return result;
    }
}
