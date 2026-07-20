<template>
  <q-page class="landing-page">
    <!-- Decorative floating blobs -->
    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>
    <div class="blob blob-3"></div>

    <!-- Navigation -->
    <nav class="landing-nav">
      <div class="nav-brand">
        <CustomLogo class="header-logo" />
        <span class="brand-name">Yoonek <span class="brand-accent">Laundry</span></span>
      </div>
      <q-btn unelevated rounded label="Login" @click="goToLogin" class="nav-login-btn" />
    </nav>

    <!-- Hero Section -->
    <section class="hero-section row items-center justify-center">
      <div class="col-12 col-md-6 text-center q-pa-xl animate-fade-in">
        <div class="hero-badge q-mb-md">
          <q-icon name="auto_awesome" size="16px" class="q-mr-xs" />
          Your Affordable Laundry Shop
        </div>
        <h1 class="hero-title q-mb-md">
          Fresh Clothes,
          <br />
          <span class="hero-title-gradient">Happy Life!</span>
        </h1>
        <div class="hero-subtitle q-mb-xl">
          Professional laundry care at prices you'll love.
          Drop it off, we handle the rest.
        </div>
        <div class="hero-actions">
          <q-btn
            size="lg"
            rounded
            unelevated
            label="Get Started"
            icon-right="arrow_forward"
            @click="goToLogin"
            class="cta-btn q-py-sm q-px-xl"
          />
        </div>
      </div>

      <div class="col-12 col-md-6 q-pa-xl">
        <div class="hero-logo-wrap animate-float">
          <div class="logo-glow"></div>
          <CustomLogo class="hero-logo" />
        </div>
      </div>
    </section>

    <!-- Stats Strip -->
    <section class="stats-strip">
      <div class="stat-item">
        <div class="stat-number">500+</div>
        <div class="stat-label">Happy Customers</div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <div class="stat-number">24hr</div>
        <div class="stat-label">Turnaround</div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <div class="stat-number">100%</div>
        <div class="stat-label">Quality Care</div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="section-block">
      <div class="section-heading">
        <div class="section-eyebrow">Why Choose Us?</div>
        <h2 class="section-title">Laundry Day, <span class="text-gradient-pink">Made Easy</span></h2>
      </div>
      <div class="row q-col-gutter-lg justify-center">
        <div class="col-12 col-sm-4">
          <div class="glass-card animate-slide-in" style="animation-delay: 0.1s">
            <div class="icon-chip">
              <q-icon name="speed" size="32px" />
            </div>
            <div class="card-title">Fast Service</div>
            <div class="card-text">
              Same-day delivery available for your convenience
            </div>
          </div>
        </div>

        <div class="col-12 col-sm-4">
          <div class="glass-card animate-slide-in" style="animation-delay: 0.2s">
            <div class="icon-chip">
              <q-icon name="eco" size="32px" />
            </div>
            <div class="card-title">Eco-Friendly</div>
            <div class="card-text">
              Environmentally safe detergents and processes
            </div>
          </div>
        </div>

        <div class="col-12 col-sm-4">
          <div class="glass-card animate-slide-in" style="animation-delay: 0.3s">
            <div class="icon-chip">
              <q-icon name="verified" size="32px" />
            </div>
            <div class="card-title">Quality Guaranteed</div>
            <div class="card-text">
              Professional care for all your garments
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Services Section -->
    <section class="section-block">
      <div class="section-heading">
        <div class="section-eyebrow">Our Services</div>
        <h2 class="section-title">Everything Your <span class="text-gradient-pink">Clothes Need</span></h2>
      </div>
      <div class="row q-col-gutter-lg justify-center">
        <div class="col-12 col-sm-6 col-md-3">
          <div class="service-card">
            <div class="service-icon">
              <q-icon name="checkroom" size="28px" />
            </div>
            <div class="card-title">Wash & Fold</div>
            <div class="card-text">Starting at $2.50/lb</div>
          </div>
        </div>

        <div class="col-12 col-sm-6 col-md-3">
          <div class="service-card">
            <div class="service-icon">
              <q-icon name="dry_cleaning" size="28px" />
            </div>
            <div class="card-title">Dry Cleaning</div>
            <div class="card-text">Professional care</div>
          </div>
        </div>

        <div class="col-12 col-sm-6 col-md-3">
          <div class="service-card">
            <div class="service-icon">
              <q-icon name="iron" size="28px" />
            </div>
            <div class="card-title">Ironing</div>
            <div class="card-text">Crisp & neat</div>
          </div>
        </div>

        <div class="col-12 col-sm-6 col-md-3">
          <div class="service-card">
            <div class="service-icon">
              <q-icon name="delivery_dining" size="28px" />
            </div>
            <div class="card-title">Pickup & Delivery</div>
            <div class="card-text">Free for orders $50+</div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Band -->
    <section class="cta-band">
      <div class="cta-content">
        <h2 class="cta-title">Ready for fresh, clean clothes?</h2>
        <div class="cta-subtitle">Join hundreds of happy customers today.</div>
        <q-btn
          size="lg"
          rounded
          unelevated
          label="Get Started Now"
          @click="goToLogin"
          class="cta-band-btn q-py-sm q-px-xl q-mt-md"
        />
      </div>
    </section>

    <!-- Footer -->
    <footer class="landing-footer">
      <div class="nav-brand justify-center q-mb-sm">
        <CustomLogo class="header-logo" />
        <span class="brand-name">Yoonek <span class="brand-accent">Laundry</span></span>
      </div>
      <div class="footer-tagline">
        Making laundry day easier, one load at a time
      </div>
      <div class="footer-copy">
        © 2024 Yoonek Laundry. All rights reserved.
      </div>
    </footer>
  </q-page>
</template>

<script setup>
import { useRouter } from 'vue-router'
import CustomLogo from '../components/CustomLogo.vue'

const router = useRouter()

function goToLogin() {
  router.push('/login')
}
</script>

<style scoped>
/* ===== Page base ===== */
.landing-page {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 15% 20%, rgba(233, 30, 140, 0.12) 0%, transparent 45%),
    radial-gradient(circle at 85% 75%, rgba(233, 30, 140, 0.10) 0%, transparent 45%),
    linear-gradient(160deg, #FFF5FA 0%, #FFE4F1 45%, #FDD3E8 100%);
  color: #4A2038;
}

/* ===== Floating blobs ===== */
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  pointer-events: none;
  z-index: 0;
}

.blob-1 {
  width: 400px;
  height: 400px;
  top: -120px;
  right: -100px;
  background: rgba(233, 30, 140, 0.25);
}

.blob-2 {
  width: 300px;
  height: 300px;
  top: 45%;
  left: -140px;
  background: rgba(255, 105, 180, 0.28);
}

.blob-3 {
  width: 350px;
  height: 350px;
  bottom: -100px;
  right: 10%;
  background: rgba(233, 30, 140, 0.18);
}

/* ===== Navigation ===== */
.landing-nav {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 40px;
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(233, 30, 140, 0.15);
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-name {
  font-size: 1.35rem;
  font-weight: 800;
  color: #E91E8C;
  letter-spacing: 0.5px;
}

.brand-accent {
  color: #4A2038;
}

.nav-login-btn {
  background: linear-gradient(135deg, #E91E8C 0%, #FF69B4 100%);
  color: white;
  font-weight: 700;
  padding: 8px 28px;
}

/* ===== Hero ===== */
.hero-section {
  position: relative;
  z-index: 1;
  padding: 48px 24px 24px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  background: rgba(233, 30, 140, 0.1);
  border: 1px solid rgba(233, 30, 140, 0.3);
  color: #C2185B;
  font-weight: 700;
  font-size: 0.85rem;
  padding: 6px 18px;
  border-radius: 999px;
  letter-spacing: 0.5px;
}

.hero-title {
  font-size: 4rem;
  line-height: 1.1;
  font-weight: 900;
  color: #4A2038;
  margin: 0 0 16px;
}

.hero-title-gradient {
  background: linear-gradient(135deg, #E91E8C 20%, #FF69B4 80%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: 1.2rem;
  color: #8A4E71;
  max-width: 440px;
  margin: 0 auto;
  line-height: 1.6;
}

.cta-btn {
  background: linear-gradient(135deg, #E91E8C 0%, #FF69B4 100%);
  color: white;
  font-weight: 700;
  box-shadow: 0 10px 30px rgba(233, 30, 140, 0.35);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.cta-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 40px rgba(233, 30, 140, 0.45);
}

/* ===== Hero logo ===== */
.hero-logo-wrap {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.logo-glow {
  position: absolute;
  width: 340px;
  height: 340px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(233, 30, 140, 0.35) 0%, transparent 70%);
  filter: blur(30px);
}

.hero-logo {
  position: relative;
  width: 320px;
  height: 320px;
  max-width: 100%;
  filter: drop-shadow(0 20px 40px rgba(233, 30, 140, 0.3));
}

.header-logo {
  width: 42px;
  height: 42px;
}

/* ===== Stats strip ===== */
.stats-strip {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 48px;
  margin: 24px auto 0;
  padding: 24px 40px;
  max-width: 720px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(233, 30, 140, 0.15);
  border-radius: 24px;
  box-shadow: 0 15px 40px rgba(233, 30, 140, 0.12);
}

.stat-number {
  font-size: 2rem;
  font-weight: 900;
  color: #E91E8C;
  text-align: center;
}

.stat-label {
  font-size: 0.85rem;
  color: #8A4E71;
  font-weight: 600;
  text-align: center;
}

.stat-divider {
  width: 1px;
  height: 44px;
  background: rgba(233, 30, 140, 0.2);
}

/* ===== Sections ===== */
.section-block {
  position: relative;
  z-index: 1;
  padding: 80px 48px 24px;
  max-width: 1100px;
  margin: 0 auto;
}

.section-heading {
  text-align: center;
  margin-bottom: 40px;
}

.section-eyebrow {
  color: #E91E8C;
  font-weight: 800;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 8px;
}

.section-title {
  font-size: 2.2rem;
  font-weight: 900;
  color: #4A2038;
  margin: 0;
  line-height: 1.2;
}

.text-gradient-pink {
  background: linear-gradient(135deg, #E91E8C 20%, #FF69B4 80%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* ===== Cards ===== */
.glass-card {
  height: 100%;
  padding: 32px 28px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(233, 30, 140, 0.15);
  border-radius: 20px;
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.glass-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 45px rgba(233, 30, 140, 0.2);
}

.icon-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 68px;
  height: 68px;
  border-radius: 20px;
  margin-bottom: 18px;
  background: linear-gradient(135deg, #E91E8C 0%, #FF69B4 100%);
  color: white;
  box-shadow: 0 10px 24px rgba(233, 30, 140, 0.35);
}

.card-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: #4A2038;
  margin-bottom: 8px;
}

.card-text {
  font-size: 0.92rem;
  color: #8A4E71;
  line-height: 1.5;
}

.service-card {
  height: 100%;
  padding: 28px 20px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(233, 30, 140, 0.15);
  border-radius: 20px;
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
}

.service-card:hover {
  transform: translateY(-6px);
  border-color: rgba(233, 30, 140, 0.45);
  box-shadow: 0 16px 36px rgba(233, 30, 140, 0.18);
}

.service-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  margin-bottom: 14px;
  background: rgba(233, 30, 140, 0.12);
  color: #E91E8C;
}

/* ===== CTA band ===== */
.cta-band {
  position: relative;
  z-index: 1;
  margin: 90px auto 0;
  max-width: 1000px;
  padding: 56px 40px;
  border-radius: 28px;
  text-align: center;
  background: linear-gradient(135deg, #E91E8C 0%, #C2185B 60%, #A0136B 100%);
  box-shadow: 0 25px 60px rgba(233, 30, 140, 0.4);
}

.cta-title {
  font-size: 2rem;
  font-weight: 900;
  color: white;
  margin: 0 0 8px;
}

.cta-subtitle {
  color: rgba(255, 255, 255, 0.85);
  font-size: 1.05rem;
}

.cta-band-btn {
  background: white;
  color: #E91E8C;
  font-weight: 800;
}

/* ===== Footer ===== */
.landing-footer {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 60px 24px 40px;
}

.footer-tagline {
  color: #8A4E71;
  font-size: 0.95rem;
}

.footer-copy {
  color: #B07E9A;
  font-size: 0.82rem;
  margin-top: 8px;
}

/* ===== Responsive ===== */
@media (max-width: 1024px) {
  .hero-logo {
    width: 260px;
    height: 260px;
  }
}

@media (max-width: 768px) {
  .landing-nav {
    padding: 12px 20px;
  }

  .hero-title {
    font-size: 2.6rem;
  }

  .hero-logo {
    width: 220px;
    height: 220px;
  }

  .logo-glow {
    width: 240px;
    height: 240px;
  }

  .stats-strip {
    gap: 24px;
    padding: 20px 24px;
    margin-left: 16px;
    margin-right: 16px;
  }

  .section-block {
    padding: 56px 24px 16px;
  }

  .section-title {
    font-size: 1.7rem;
  }

  .cta-band {
    margin: 60px 16px 0;
    padding: 40px 24px;
  }

  .cta-title {
    font-size: 1.5rem;
  }
}

@media (max-width: 480px) {
  .brand-name {
    font-size: 1.1rem;
  }

  .header-logo {
    width: 34px;
    height: 34px;
  }

  .hero-title {
    font-size: 2.1rem;
  }

  .hero-logo {
    width: 180px;
    height: 180px;
  }

  .stat-number {
    font-size: 1.4rem;
  }

  .stat-divider {
    display: none;
  }

  .stats-strip {
    flex-wrap: wrap;
    gap: 20px;
  }
}
</style>
