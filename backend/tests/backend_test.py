import os
import uuid
import requests

BASE_URL = os.environ["PRINTSEVA_TEST_BASE_URL"].rstrip("/")


def test_health_and_empty_shapes():
    assert requests.get(f"{BASE_URL}/api/", timeout=20).json()["message"]
    wallet = requests.get(f"{BASE_URL}/api/wallet", timeout=20)
    assert wallet.status_code == 200
    assert {"escrow_balance", "platform_fees", "vendor_payouts"} <= wallet.json().keys()


def test_job_bid_accept_proof_verify_flow():
    s = requests.Session()
    suffix = uuid.uuid4().hex[:8]
    job = s.post(f"{BASE_URL}/api/jobs", json={
        "title": f"TEST_{suffix}", "category": "pasting", "dimension": "10x4 ft",
        "city": "Jaipur", "pincode": "302001", "budget": 3000,
        "deadline": "2099-12-31", "description": "regression",
    }, timeout=20)
    assert job.status_code == 200
    data = job.json(); job_id = data["id"]
    assert data["title"].startswith("TEST_")
    assert any(x["id"] == job_id for x in s.get(f"{BASE_URL}/api/jobs", timeout=20).json())
    bid = s.post(f"{BASE_URL}/api/jobs/{job_id}/bids", json={
        "vendor_name": f"Vendor_{suffix}", "quote": 2000, "delivery_days": 3,
    }, timeout=20)
    assert bid.status_code == 200
    bid_id = bid.json()["id"]
    assert s.post(f"{BASE_URL}/api/jobs/{job_id}/bids/{bid_id}/accept", timeout=20).status_code == 200
    proof = s.post(f"{BASE_URL}/api/jobs/{job_id}/proof", json={
        "photo_url": "https://example.com/proof.jpg", "lat": 26.9, "lng": 75.7,
        "address": "Jaipur", "captured_at": "2099-01-01T00:00:00Z",
    }, timeout=20)
    assert proof.status_code == 200
    settled = s.post(f"{BASE_URL}/api/jobs/{job_id}/verify", timeout=20)
    assert settled.status_code == 200
    assert settled.json()["platform_fee"] == 500
    assert settled.json()["vendor_payout"] == 1500
    assert s.post(f"{BASE_URL}/api/jobs/{job_id}/bids/{bid_id}/accept", timeout=20).status_code == 400
