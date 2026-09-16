import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-md px-6 py-10">
      <header className="pt-8">
        <p className="text-sm font-semibold tracking-[0.16em] text-gray-500">
          FAVEWAY
        </p>

        <h1 className="mt-4 text-3xl font-bold leading-tight">
          좋아하는 장면을 따라
          <br />
          서울을 여행해보세요.
        </h1>

        <p className="mt-4 text-sm leading-6 text-gray-500">
          작품과 배우의 실제 촬영지를 찾아보고,
          <br />
          원하는 조건으로 여행 코스도 만들 수 있어요.
        </p>
      </header>

      <section className="mt-12 space-y-4">
        <Link
          href="/plan"
          className="block rounded-3xl border border-gray-200 bg-white p-6 transition hover:border-black"
        >
          <p className="text-xs font-semibold text-gray-400">01</p>

          <h2 className="mt-3 text-xl font-bold">코스 만들기</h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            좋아하는 작품이나 배우를 선택하고 여행 시간과 도보 조건에 맞는
            촬영지 코스를 만들어요.
          </p>

          <p className="mt-5 text-sm font-semibold">코스 만들러 가기 →</p>
        </Link>

        <Link
          href="/explore"
          className="block rounded-3xl border border-gray-200 bg-white p-6 transition hover:border-black"
        >
          <p className="text-xs font-semibold text-gray-400">02</p>

          <h2 className="mt-3 text-xl font-bold">촬영지 둘러보기</h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            작품이나 배우를 기준으로 관련 촬영지를 찾아보고 장면과 장소 정보를
            확인해요.
          </p>

          <p className="mt-5 text-sm font-semibold">촬영지 찾아보기 →</p>
        </Link>
      </section>
    </main>
  );
}
