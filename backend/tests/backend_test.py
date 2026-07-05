"""Backend API tests for Customer Registry Pro."""
import os
import io
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback for local runs
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@registry.pro"
ADMIN_PASSWORD = "Admin@12345"


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "user" in data
    return data["token"]


@pytest.fixture(scope="session")
def auth(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ---------------- Auth ----------------
class TestAuth:
    def test_admin_login(self, admin_token):
        assert isinstance(admin_token, str) and len(admin_token) > 20

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_me(self, auth):
        r = requests.get(f"{API}/auth/me", headers=auth, timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_me_unauthenticated(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401

    def test_register_and_login(self):
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/register", json={"email": email, "password": "pass1234", "name": "Test User"}, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["email"] == email
        # duplicate
        r2 = requests.post(f"{API}/auth/register", json={"email": email, "password": "pass1234", "name": "Test User"}, timeout=15)
        assert r2.status_code == 400
        # login works
        r3 = requests.post(f"{API}/auth/login", json={"email": email, "password": "pass1234"}, timeout=15)
        assert r3.status_code == 200
        assert "token" in r3.json()

    def test_forgot_password(self):
        r = requests.post(f"{API}/auth/forgot-password", json={"email": ADMIN_EMAIL}, timeout=15)
        assert r.status_code == 200
        assert "message" in r.json()


# ---------------- Dashboard ----------------
class TestDashboard:
    def test_stats(self, auth):
        r = requests.get(f"{API}/dashboard/stats", headers=auth, timeout=20)
        assert r.status_code == 200
        d = r.json()
        for key in ("customers", "complaints", "monthly", "categories", "csat", "avg_resolution_hours"):
            assert key in d, f"missing {key}"
        assert d["customers"]["total"] >= 40
        assert d["complaints"]["total"] >= 50
        assert isinstance(d["monthly"], list) and len(d["monthly"]) == 6

    def test_activity(self, auth):
        r = requests.get(f"{API}/dashboard/activity", headers=auth, timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("complaints", "interactions", "upcoming"):
            assert k in d and isinstance(d[k], list)


# ---------------- Customers ----------------
class TestCustomers:
    def test_list(self, auth):
        r = requests.get(f"{API}/customers?limit=10", headers=auth, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "total" in d and "items" in d
        assert d["total"] >= 40
        assert len(d["items"]) <= 10

    def test_search_and_filter(self, auth):
        r = requests.get(f"{API}/customers?status=vip&limit=100", headers=auth, timeout=15)
        assert r.status_code == 200
        for it in r.json()["items"]:
            assert it["status"] == "vip"

    def test_crud_and_cascade(self, auth):
        payload = {"name": "TEST Cust", "email": f"test_{uuid.uuid4().hex[:6]}@example.com", "status": "active"}
        r = requests.post(f"{API}/customers", headers=auth, json=payload, timeout=15)
        assert r.status_code == 200, r.text
        cid = r.json()["id"]

        # add a complaint referencing this customer
        cpl = requests.post(f"{API}/complaints", headers=auth, json={
            "customer_id": cid, "subject": "TEST subj", "description": "d", "priority": "low", "status": "open", "category": "General"
        }, timeout=15)
        assert cpl.status_code == 200, cpl.text
        cpl_id = cpl.json()["id"]

        # get customer
        r2 = requests.get(f"{API}/customers/{cid}", headers=auth, timeout=15)
        assert r2.status_code == 200

        # update customer
        upd = requests.put(f"{API}/customers/{cid}", headers=auth, json={**payload, "name": "TEST Cust Updated"}, timeout=15)
        assert upd.status_code == 200
        assert upd.json()["name"] == "TEST Cust Updated"

        # delete cascades
        d = requests.delete(f"{API}/customers/{cid}", headers=auth, timeout=15)
        assert d.status_code == 200

        g = requests.get(f"{API}/complaints/{cpl_id}", headers=auth, timeout=15)
        assert g.status_code == 404


# ---------------- Complaints ----------------
class TestComplaints:
    @pytest.fixture(scope="class")
    def customer_id(self, auth):
        r = requests.get(f"{API}/customers?limit=1", headers=auth, timeout=15)
        return r.json()["items"][0]["id"]

    def test_list_with_customer(self, auth):
        r = requests.get(f"{API}/complaints", headers=auth, timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert len(items) > 0
        assert "customer" in items[0]

    def test_create_partial_update_comment_attachment(self, auth, customer_id):
        r = requests.post(f"{API}/complaints", headers=auth, json={
            "customer_id": customer_id, "subject": "TEST complaint", "description": "desc",
            "priority": "medium", "status": "open", "category": "Bug",
        }, timeout=15)
        assert r.status_code == 200
        cid = r.json()["id"]
        assert r.json().get("timeline"), "timeline not initialized"

        # partial update status only
        u = requests.put(f"{API}/complaints/{cid}", headers=auth, json={"status": "in_progress"}, timeout=15)
        assert u.status_code == 200, u.text
        assert u.json()["status"] == "in_progress"

        # partial update priority only
        u2 = requests.put(f"{API}/complaints/{cid}", headers=auth, json={"priority": "high"}, timeout=15)
        assert u2.status_code == 200
        assert u2.json()["priority"] == "high"

        # comment
        c = requests.post(f"{API}/complaints/{cid}/comments", headers=auth, json={"body": "hello", "internal": False}, timeout=15)
        assert c.status_code == 200
        assert c.json()["body"] == "hello"

        # attachment
        files = {"file": ("test.txt", io.BytesIO(b"hello world"), "text/plain")}
        a = requests.post(f"{API}/complaints/{cid}/attachments", headers=auth, files=files, timeout=20)
        assert a.status_code == 200, a.text
        assert a.json()["filename"] == "test.txt"

        # verify persistence
        g = requests.get(f"{API}/complaints/{cid}", headers=auth, timeout=15)
        assert g.status_code == 200
        gd = g.json()
        assert len(gd["comments"]) >= 1
        assert len(gd["attachments"]) >= 1
        assert len(gd["timeline"]) >= 2  # created + status/priority changes

        # cleanup
        requests.delete(f"{API}/complaints/{cid}", headers=auth, timeout=15)


# ---------------- Tickets ----------------
class TestTickets:
    def test_list_and_create(self, auth):
        r = requests.get(f"{API}/tickets", headers=auth, timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) > 0
        assert "customer" in items[0]

        cust = requests.get(f"{API}/customers?limit=1", headers=auth, timeout=15).json()["items"][0]
        c = requests.post(f"{API}/tickets", headers=auth, json={
            "customer_id": cust["id"], "title": "TEST ticket", "description": "d",
            "priority": "low", "status": "open", "channel": "email",
        }, timeout=15)
        assert c.status_code == 200
        tid = c.json()["id"]
        requests.delete(f"{API}/tickets/{tid}", headers=auth, timeout=15)


# ---------------- Interactions ----------------
class TestInteractions:
    def test_list_and_filter(self, auth):
        r = requests.get(f"{API}/interactions", headers=auth, timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) > 0
        cid = items[0]["customer_id"]
        r2 = requests.get(f"{API}/interactions?customer_id={cid}", headers=auth, timeout=15)
        assert r2.status_code == 200
        for it in r2.json():
            assert it["customer_id"] == cid

    def test_create(self, auth):
        cust = requests.get(f"{API}/customers?limit=1", headers=auth, timeout=15).json()["items"][0]
        r = requests.post(f"{API}/interactions", headers=auth, json={
            "customer_id": cust["id"], "kind": "note", "summary": "TEST", "body": "b"
        }, timeout=15)
        assert r.status_code == 200
        assert r.json()["summary"] == "TEST"


# ---------------- Notifications ----------------
class TestNotifications:
    def test_list_mark_read_all(self, auth):
        r = requests.get(f"{API}/notifications", headers=auth, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "items" in d and "unread" in d

        # mark one read if any
        if d["items"]:
            nid = d["items"][0]["id"]
            m = requests.post(f"{API}/notifications/{nid}/read", headers=auth, timeout=15)
            assert m.status_code == 200

        # mark all read → unread should be 0
        m2 = requests.post(f"{API}/notifications/read-all", headers=auth, timeout=15)
        assert m2.status_code == 200
        r2 = requests.get(f"{API}/notifications", headers=auth, timeout=15)
        assert r2.json()["unread"] == 0


# ---------------- Search ----------------
class TestSearch:
    def test_search_empty(self, auth):
        r = requests.get(f"{API}/search?q=", headers=auth, timeout=15)
        # empty q may 422 due to required, but code returns empty for len<2
        assert r.status_code in (200, 422)
        if r.status_code == 200:
            d = r.json()
            assert d == {"customers": [], "complaints": [], "tickets": []}

    def test_search_valid(self, auth):
        r = requests.get(f"{API}/search?q=pay", headers=auth, timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("customers", "complaints", "tickets"):
            assert k in d and isinstance(d[k], list)
