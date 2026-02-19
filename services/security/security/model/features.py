import re
import numpy as np
import requests
import tldextract
import socket
from urllib.parse import urlparse

session = requests.Session()
session.headers.update({"User-Agent": "Mozilla/5.0"})

def is_ip(host):
    try:
        socket.inet_aton(host)
        return 1
    except:
        return 0

def extract_features(url):
    url = str(url).strip()
    features = []

    try:
        parsed = urlparse(url)
        ext = tldextract.extract(url)
        host = parsed.hostname or ""
        domain = f"{ext.domain}.{ext.suffix}"

        url_len = len(url)
        domain_len = len(domain)
        sub_count = len(ext.subdomain.split(".")) if ext.subdomain else 0
        suffix_len = len(ext.suffix)

        alpha_ratio = sum(c.isalpha() for c in url) / url_len if url_len else 0
        digit_ratio = sum(c.isdigit() for c in url) / url_len if url_len else 0
        special_ratio = (url_len - sum(c.isalnum() for c in url)) / url_len if url_len else 0

        features += [
            url_len,
            domain_len,
            is_ip(host),
            suffix_len,
            sub_count,
            1 if parsed.scheme == "https" else 0,
            alpha_ratio,
            digit_ratio,
            special_ratio
        ]

        try:
            r = session.get(url, timeout=2, allow_redirects=True)
            html = r.text.lower()

            redirect_count = len(r.history)
            has_title = 1 if "<title>" in html else 0
            has_favicon = 1 if "favicon" in html else 0
            has_password = 1 if 'type="password"' in html else 0
            has_submit = 1 if 'type="submit"' in html else 0
            has_iframe = 1 if "<iframe" in html else 0
            line_count = html.count("\n")

            features += [
                0,
                redirect_count,
                has_title,
                has_favicon,
                has_password,
                has_submit,
                has_iframe,
                line_count
            ]

        except:
            features += [1,0,0,0,0,0,0,0]

    except:
        return np.zeros((1, 17), dtype=np.float32)

    return np.array([features], dtype=np.float32)
