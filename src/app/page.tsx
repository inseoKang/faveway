import Link from "next/link";

export default function Home() {
  return (
    <main className="fw-page fw-home">
      <header className="fw-home-nav">
        <span className="fw-wordmark">
          FAVEWAY<span aria-hidden="true">.</span>
        </span>
        <span className="fw-badge">서울의 촬영지</span>
      </header>

      <section className="fw-hero" aria-labelledby="home-title">
        <p className="fw-eyebrow">FIND YOUR FAVORITE WAY</p>
        <h1 id="home-title">
          좋아하는 장면이,
          <br />
          <span>나의 여행이 되는 곳.</span>
        </h1>
        <p className="fw-intro">
          영화와 드라마 속 장소를 발견하고,
          <br />
          좋아하는 배우의 장면을 따라 서울을 걸어요.
        </p>
        <div
          className="fw-story-path"
          aria-label="작품에서 장면으로, 장면에서 실제 장소로"
        >
          <span>
            <b>01</b>좋아하는 작품
          </span>
          <i aria-hidden="true">→</i>
          <span>
            <b>02</b>기억 속 장면
          </span>
          <i aria-hidden="true">→</i>
          <span>
            <b>03</b>실제 장소
          </span>
        </div>
      </section>

      <section className="fw-home-actions" aria-label="여행 시작하기">
        <Link href="/plan" className="fw-home-card fw-home-card-primary">
          <span className="fw-home-icon" aria-hidden="true">
            ↗
          </span>
          <p className="fw-eyebrow">MAKE YOUR WAY</p>
          <h2>나만의 코스 만들기</h2>
          <p>
            작품·배우와 여행 시간을 선택하면
            <br />
            걸어서 만나는 촬영지 코스를 만들어요.
          </p>
          <span className="fw-home-link">
            코스 만들기 <span aria-hidden="true">→</span>
          </span>
        </Link>
        <Link href="/explore" className="fw-home-card">
          <span className="fw-home-icon" aria-hidden="true">
            ⌖
          </span>
          <p className="fw-eyebrow">DISCOVER THE SCENE</p>
          <h2>촬영지 둘러보기</h2>
          <p>
            작품과 배우에 연결된 장소를 찾고,
            <br />
            그곳에 담긴 장면과 이야기를 살펴보세요.
          </p>
          <span className="fw-home-link">
            촬영지 찾아보기 <span aria-hidden="true">→</span>
          </span>
        </Link>
      </section>
      <p className="fw-home-footer">좋아하는 이야기가 있는 곳으로.</p>
    </main>
  );
}
