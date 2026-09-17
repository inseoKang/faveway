import type { ReactNode } from "react";
import BackButton from "./BackButton";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  step?: 1 | 2;
  children?: ReactNode;
};

export default function PageHeader({
  eyebrow,
  title,
  description,
  step,
  children,
}: PageHeaderProps) {
  return (
    <header className="fw-header">
      <nav className="fw-nav" aria-label="페이지 탐색">
        <BackButton />
        <span className="fw-wordmark">
          FAVEWAY<span aria-hidden="true">.</span>
        </span>
      </nav>
      {step && (
        <ol className="fw-progress" aria-label="코스 만들기 진행 단계">
          <li aria-current={step === 1 ? "step" : undefined}>
            <span>1</span>콘텐츠 선택
          </li>
          <li aria-current={step === 2 ? "step" : undefined}>
            <span>2</span>여행 조건
          </li>
          <li>
            <span>3</span>나의 코스
          </li>
        </ol>
      )}
      <p className="fw-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {description && <p className="fw-intro">{description}</p>}
      {children}
    </header>
  );
}
