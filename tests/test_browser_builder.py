import os
import socket
import unittest
from pathlib import Path

CHROME_PATHS = (
    Path("C:/Program Files/Google/Chrome/Application/chrome.exe"),
    Path("C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"),
    Path("/usr/bin/google-chrome"),
    Path("/usr/bin/google-chrome-stable"),
    Path("/usr/bin/chromium"),
    Path("/usr/bin/chromium-browser"),
)


def available_port() -> int:
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        return int(listener.getsockname()[1])


def chrome_path() -> Path | None:
    # CI matrix jobs can opt out of the (slow) real-browser suites with
    # PEROVSKITE_SKIP_BROWSER=1; the frontend job still runs them on Linux.
    if os.environ.get("PEROVSKITE_SKIP_BROWSER") == "1":
        return None
    return next((path for path in CHROME_PATHS if path.exists()), None)



if __name__ == "__main__":
    unittest.main()
