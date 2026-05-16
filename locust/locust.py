import random

BRANDS = ["Rolex", "Omega", "Seiko", "Casio", "TAG Heuer"]
SEARCH_TERMS = ["rolex", "gold", "automatic", "luxury", "sport"]


class BrowsingUser(HttpUser):
    """Regular visitor browsing the store — 70% of traffic."""
    weight = 70
    wait_time = between(1, 3)

    @task(5)
    def list_watches(self):
        self.client.get("/api/watches")

    @task(4)
    def search_watches(self):
        q = random.choice(SEARCH_TERMS)
        self.client.get(f"/api/watches?search={q}", name="/api/watches?search=[q]")

    @task(3)
    def filter_by_brand(self):
        brand = random.choice(BRANDS)
        self.client.get(f"/api/watches?brand={brand}", name="/api/watches?brand=[brand]")

    @task(2)
    def list_reviews(self):
        self.client.get("/api/reviews")

    @task(1)
    def health_check(self):
        self.client.get("/api/health")


class AuthenticatedUser(HttpUser):
    """Logged-in buyer — 30% of traffic."""
    weight = 30
    wait_time = between(2, 5)

    def on_start(self):
        uid = random.randint(10000, 99999)
        self.email = f"loadtest_{uid}@test.com"
        self.password = "Test@12345"

        # Register
        self.client.post("/api/auth/register", json={
            "username": f"loadtest_{uid}",
            "email": self.email,
            "password": self.password
        }, name="/api/auth/register")

        # Login
        resp = self.client.post("/api/auth/login", json={
            "email": self.email,
            "password": self.password
        }, name="/api/auth/login")

        if resp.status_code == 200:
            try:
                data = resp.json()
                token = data.get("token") or data.get("data", {}).get("token", "")
                self.client.headers.update({"Authorization": f"Bearer {token}"})
            except Exception:
                pass

    @task(4)
    def browse_watches(self):
        self.client.get("/api/watches", name="/api/watches [auth]")

    @task(3)
    def view_orders(self):
        self.client.get("/api/orders", name="/api/orders")

    @task(2)
    def view_profile(self):
        self.client.get("/api/users/profile", name="/api/users/profile")

    @task(1)
    def view_reviews(self):
        self.client.get("/api/reviews", name="/api/reviews [auth]")
