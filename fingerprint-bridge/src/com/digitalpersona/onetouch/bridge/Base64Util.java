package com.digitalpersona.onetouch.bridge;

/** Minimal Base64 codec (java.util.Base64 needs Java 8+, this bridge targets JDK 1.6). */
public class Base64Util {

    private static final char[] ALPHABET =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".toCharArray();

    public static String encode(byte[] data) {
        StringBuilder out = new StringBuilder((data.length + 2) / 3 * 4);
        int i = 0;
        while (i < data.length) {
            int b0 = data[i++] & 0xFF;
            int b1 = i < data.length ? data[i++] & 0xFF : -1;
            int b2 = i < data.length ? data[i++] & 0xFF : -1;

            out.append(ALPHABET[b0 >> 2]);
            out.append(ALPHABET[((b0 & 0x3) << 4) | (b1 == -1 ? 0 : b1 >> 4)]);
            out.append(b1 == -1 ? '=' : ALPHABET[((b1 & 0xF) << 2) | (b2 == -1 ? 0 : b2 >> 6)]);
            out.append(b2 == -1 ? '=' : ALPHABET[b2 & 0x3F]);
        }
        return out.toString();
    }

    public static byte[] decode(String encoded) {
        String s = encoded.replaceAll("[^A-Za-z0-9+/=]", "");
        int padding = 0;
        if (s.endsWith("==")) padding = 2;
        else if (s.endsWith("=")) padding = 1;

        int outLen = (s.length() / 4) * 3 - padding;
        byte[] out = new byte[outLen];
        int outIndex = 0;
        int buffer = 0;
        int bitsCollected = 0;

        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '=') break;
            int value = indexOf(c);
            if (value < 0) continue;
            buffer = (buffer << 6) | value;
            bitsCollected += 6;
            if (bitsCollected >= 8) {
                bitsCollected -= 8;
                out[outIndex++] = (byte) ((buffer >> bitsCollected) & 0xFF);
            }
        }
        return out;
    }

    private static int indexOf(char c) {
        for (int i = 0; i < ALPHABET.length; i++) {
            if (ALPHABET[i] == c) return i;
        }
        return -1;
    }
}
