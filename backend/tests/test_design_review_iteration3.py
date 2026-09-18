import io
import os
import uuid
import requests

BASE_URL = os.environ.get("PRINTSEVA_TEST_BASE_URL", "https://hyperlocal-print.preview.emergentagent.com").rstrip("/")


def test_design_review_lifecycle_and_file_delivery():
    s = requests.Session()
    suffix = uuid.uuid4().hex[:8]
    job = s.post(f"{BASE_URL}/api/jobs", json={
        "title": f"TEST_design_{suffix}", "category": "design", "dimension": "A4",
        "city": "Jaipur", "pincode": "302001", "budget": 2400,
        "deadline": "2099-12-31", "description": "design review regression",
    }, timeout=30)
    assert job.status_code == 200
    jid = job.json()["id"]
    bid = s.post(f"{BASE_URL}/api/jobs/{jid}/bids", json={
        "vendor_name": f"TEST_Graphic_{suffix}", "vendor_type": "designer", "quote": 2000, "delivery_days": 3,
    }, timeout=30)
    assert bid.status_code == 200
    bid_id = bid.json()["id"]
    assert s.post(f"{BASE_URL}/api/jobs/{jid}/bids/{bid_id}/accept", timeout=30).status_code == 200

    png = b"\x89PNG\r\n\x1a\n" + b"0" * 64
    upload = s.post(f"{BASE_URL}/api/jobs/{jid}/design/versions", files={"file": ("draft.png", io.BytesIO(png), "image/png")}, timeout=60)
    assert upload.status_code == 200, upload.text
    version = upload.json()
    assert version["version_no"] == 1 and version["url"] and version["storage_path"]
    served = s.get(f"{BASE_URL}{version['url']}", timeout=60)
    assert served.status_code == 200 and served.headers["content-type"].startswith("image/png")
    download = s.get(f"{BASE_URL}{version['url']}?download=1", timeout=60)
    assert download.status_code == 200 and "attachment" in download.headers.get("content-disposition", "")

    pin = s.post(f"{BASE_URL}/api/jobs/{jid}/design/pins", json={"version_id": version["id"], "x_pct": 40, "y_pct": 30, "comment": "TEST change"}, timeout=30)
    assert pin.status_code == 200
    pid = pin.json()["id"]
    assert s.patch(f"{BASE_URL}/api/jobs/{jid}/design/pins/{pid}", json={"status": "resolved"}, timeout=30).status_code == 200
    approved = s.post(f"{BASE_URL}/api/jobs/{jid}/design/approve", timeout=30)
    assert approved.status_code == 200
    assert approved.json()["released_amount"] == 2000 and approved.json()["platform_fee"] == 500 and approved.json()["vendor_payout"] == 1500
    assert s.post(f"{BASE_URL}/api/jobs/{jid}/design/approve", timeout=30).status_code == 400
    assert s.post(f"{BASE_URL}/api/jobs/{jid}/design/forward-press", timeout=30).status_code == 200
    assert s.post(f"{BASE_URL}/api/jobs/{jid}/design/forward-press", timeout=30).status_code == 400