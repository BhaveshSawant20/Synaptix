const features = [
  {
    number: "01",
    title: "Academic Intelligence",
    description:
      "Bring schools, standards, subjects, exams and syllabus requirements together in one organized workspace.",
    icon: "◈",
  },
  {
    number: "02",
    title: "AI Academic Planner",
    description:
      "Plan teaching, revision and tests around different schools' exam dates and syllabus progress.",
    icon: "✳",
  },
  {
    number: "03",
    title: "Question Intelligence",
    description:
      "Organize previous papers and important questions to identify recurring topics and patterns.",
    icon: "⌕",
  },
];

const upcomingExams = [
  {
    subject: "Physics",
    school: "St. Xavier's School",
    date: "10",
    month: "OCT",
    color: "bg-orange-100 text-orange-700",
  },
  {
    subject: "Mathematics",
    school: "Demo School",
    date: "14",
    month: "OCT",
    color: "bg-amber-100 text-amber-700",
  },
];

function BrandMark() {
  return (
    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-orange-200">
      <img
        src="/synaptix-logo.png"
        alt="Synaptix"
        className="h-full w-full object-contain"
      />
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[590px]">
      <div className="absolute -inset-5 rounded-[2.5rem] bg-orange-200/30 blur-3xl" />

      <div className="glass relative overflow-hidden rounded-[1.75rem] p-4 sm:p-5">
        <div className="mb-5 flex items-center justify-between border-b border-stone-200/70 pb-4">
          <div className="flex items-center gap-3">
            <BrandMark />

            <div>
              <p className="text-sm font-bold tracking-tight text-stone-800">
                Synaptix
              </p>

              <p className="text-xs text-stone-500">
                Institute workspace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-orange-500" />

            <span className="text-xs font-medium text-orange-700">
              Overview
            </span>
          </div>
        </div>

        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-stone-500">
              YOUR INSTITUTE AT A GLANCE
            </p>

            <h2 className="mt-1 text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
              Academic overview
            </h2>

            <p className="mt-1 text-sm text-stone-500">
              Here&apos;s what&apos;s happening today.
            </p>
          </div>

          <div className="hidden rounded-xl bg-white/80 px-3 py-2 text-right shadow-sm sm:block">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
              Academic year
            </p>

            <p className="text-sm font-semibold text-stone-700">
              2026–27
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Students", value: "128", icon: "♙" },
            { label: "Schools", value: "06", icon: "⌂" },
            { label: "Batches", value: "08", icon: "▦" },
            { label: "Teachers", value: "12", icon: "♧" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-stone-200/70 bg-white/70 p-3"
            >
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-lg text-orange-600">
                {stat.icon}
              </div>

              <p className="text-xl font-bold tracking-tight text-stone-800">
                {stat.value}
              </p>

              <p className="mt-0.5 text-xs text-stone-500">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-stone-200/70 bg-white/75 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-800">
                Upcoming exams
              </h3>

              <span className="text-xs font-medium text-orange-600">
                View all ↗
              </span>
            </div>

            <div className="space-y-3">
              {upcomingExams.map((exam) => (
                <div
                  key={exam.subject}
                  className="flex items-center gap-3"
                >
                  <div
                    className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl ${exam.color}`}
                  >
                    <span className="text-base font-bold leading-none">
                      {exam.date}
                    </span>

                    <span className="mt-1 text-[9px] font-bold tracking-wider">
                      {exam.month}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-800">
                      {exam.subject}
                    </p>

                    <p className="truncate text-xs text-stone-500">
                      {exam.school}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-dark rounded-2xl p-4 text-white">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-400/20 text-lg text-orange-300">
                ✳
              </span>

              <span className="text-xs font-semibold text-orange-200">
                AI INTELLIGENCE
              </span>
            </div>

            <h3 className="mt-4 text-lg font-semibold leading-snug">
              Plan smarter.
              <br />
              Teach with clarity.
            </h3>

            <p className="mt-2 text-xs leading-5 text-stone-300">
              Academic planning insights designed around your institute&apos;s
              data.
            </p>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
                Planner status
              </p>

              <p className="mt-1 text-sm font-medium">
                Ready for your data
              </p>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="orange-gradient h-full w-2/3 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50/80 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-orange-600 shadow-sm">
            ✦
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold text-stone-800">
              Your academic workspace, connected
            </p>

            <p className="mt-0.5 text-xs text-stone-500">
              Schools · Batches · Syllabus · Performance
            </p>
          </div>

          <span className="ml-auto text-orange-500">
            ↗
          </span>
        </div>
      </div>

      <div className="glass absolute -bottom-5 -left-3 hidden items-center gap-3 rounded-2xl px-4 py-3 shadow-xl sm:flex">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          ✓
        </div>

        <div>
          <p className="text-xs font-semibold text-stone-800">
            One connected workspace
          </p>

          <p className="text-[11px] text-stone-500">
            Your institute, organized
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">

      {/* Navigation */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-orange-100/70 bg-[#fffaf5]/90 backdrop-blur-xl">
        <nav className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">

          <a
            href="/"
            className="flex items-center gap-3"
          >
            <BrandMark />

            <div>
              <span className="text-lg font-bold tracking-tight text-stone-900">
                Synaptix
              </span>

              <p className="-mt-0.5 text-[10px] font-medium tracking-[0.16em] text-stone-500">
                COACHING INTELLIGENCE
              </p>
            </div>
          </a>

          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm font-medium text-stone-600 transition hover:text-orange-600"
            >
              Features
            </a>

            <a
              href="#how-it-works"
              className="text-sm font-medium text-stone-600 transition hover:text-orange-600"
            >
              How it works
            </a>

            <a
              href="#about"
              className="text-sm font-medium text-stone-600 transition hover:text-orange-600"
            >
              About
            </a>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-orange-50 sm:inline-flex"
            >
              Log in
            </a>

            <a
              href="/register"
              className="orange-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-200/70 transition hover:-translate-y-0.5 hover:shadow-orange-300/70"
            >
              Get started
              <span aria-hidden="true">
                ↗
              </span>
            </a>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative pt-[76px]">
        <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-orange-200/25 blur-3xl" />

        <div className="pointer-events-none absolute -right-40 top-40 h-96 w-96 rounded-full bg-amber-200/25 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 pb-24 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[0.9fr_1.1fr] lg:px-12 lg:pb-32 lg:pt-28">

          <div className="max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-white/75 px-4 py-2 shadow-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-sm text-orange-600">
                ✳
              </span>

              <span className="text-xs font-semibold text-stone-700 sm:text-sm">
                A smarter way to manage coaching
              </span>
            </div>

            <h1 className="text-4xl font-semibold leading-[1.12] tracking-[-0.045em] text-stone-900 sm:text-5xl lg:text-[4.25rem]">
              Bring your
              <br />
              academics into
              <br />
              <span className="orange-text">
                focus.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-7 text-stone-600 sm:text-lg sm:leading-8">
              One intelligent workspace for coaching institutes to organize
              academic data, coordinate different school schedules, and plan
              with confidence.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="/register"
                className="orange-gradient inline-flex min-h-13 items-center justify-center gap-3 rounded-2xl px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-orange-200/70 transition hover:-translate-y-0.5 hover:shadow-orange-300/70"
              >
                Explore Synaptix
                <span aria-hidden="true">
                  →
                </span>
              </a>

              <a
                href="#how-it-works"
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white/70 px-6 py-3.5 text-sm font-semibold text-stone-700 transition hover:border-orange-200 hover:bg-white"
              >
                See how it works
                <span aria-hidden="true">
                  ↓
                </span>
              </a>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-stone-500 sm:text-sm">
              <span className="flex items-center gap-2">
                <span className="text-orange-500">
                  ✓
                </span>
                Institute-focused
              </span>

              <span className="flex items-center gap-2">
                <span className="text-orange-500">
                  ✓
                </span>
                Connected academics
              </span>

              <span className="flex items-center gap-2">
                <span className="text-orange-500">
                  ✓
                </span>
                AI-ready platform
              </span>
            </div>
          </div>

          <div className="px-1 py-4 sm:px-4 lg:py-0">
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-stone-200/70 bg-white/50">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-center sm:px-8 md:flex-row md:items-center md:justify-between md:text-left lg:px-12">
          <p className="text-sm font-semibold text-stone-700">
            Built for the way coaching institutes work.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-stone-500 sm:text-sm">
            <span>
              Multi-school academics
            </span>

            <span className="hidden text-orange-300 sm:inline">
              ✳
            </span>

            <span>
              Unified batch management
            </span>

            <span className="hidden text-orange-300 sm:inline">
              ✳
            </span>

            <span>
              Data-informed planning
            </span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-12 lg:py-32"
      >
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">
            One connected platform
          </p>

          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            Less scattered data.
            <br />
            <span className="orange-text">
              More academic clarity.
            </span>
          </h2>

          <p className="mt-5 text-base leading-7 text-stone-600">
            Manage the moving parts of your institute from one organized
            workspace — built to support better academic decisions.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.number}
              className="glass group rounded-3xl p-7 transition duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-100/60 sm:p-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-2xl text-orange-600 transition group-hover:orange-gradient group-hover:text-stone-900">
                  {feature.icon}
                </div>

                <span className="text-xs font-semibold tracking-widest text-stone-300">
                  {feature.number}
                </span>
              </div>

              <h3 className="mt-7 text-xl font-semibold tracking-tight text-stone-900">
                {feature.title}
              </h3>

              <p className="mt-3 text-sm leading-6 text-stone-600">
                {feature.description}
              </p>

              <a
                href="#how-it-works"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-orange-600 transition group-hover:gap-3"
              >
                Learn more
                <span aria-hidden="true">
                  →
                </span>
              </a>
            </article>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="border-y border-orange-100/70 bg-white/55"
      >
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center lg:px-12 lg:py-28">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">
              How it works
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              From scattered information to a clearer plan.
            </h2>

            <p className="mt-5 max-w-xl text-base leading-7 text-stone-600">
              Synaptix brings your institute&apos;s academic information
              together, helping you understand what needs attention and plan
              the next steps.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                step: "01",
                title: "Collect",
                text: "Bring your institute's academic information together.",
              },
              {
                step: "02",
                title: "Organize",
                text: "Connect schools, standards, subjects, batches and exams.",
              },
              {
                step: "03",
                title: "Analyze",
                text: "Review syllabus progress, attendance and performance.",
              },
              {
                step: "04",
                title: "Plan",
                text: "Use academic insights to guide teaching and revision.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="glass flex items-start gap-4 rounded-2xl p-5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-xs font-bold text-orange-700">
                  {item.step}
                </span>

                <div>
                  <h3 className="font-semibold text-stone-800">
                    {item.title}
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-stone-500">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About / CTA */}
      <section
        id="about"
        className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-12 lg:py-32"
      >
        <div className="glass relative overflow-hidden rounded-[2rem] p-8 sm:p-12 lg:p-16">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-orange-200/40 blur-3xl" />

          <div className="relative max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
              <span>
                ✳
              </span>

              Introducing Synaptix
            </div>

            <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl lg:text-5xl">
              Your institute&apos;s academics,
              <span className="orange-text">
                {" "}
                working together.
              </span>
            </h2>

            <p className="mt-5 max-w-2xl text-base leading-7 text-stone-600">
              A centralized academic management platform designed around the
              real complexity of coaching institutes — with AI intelligence
              planned to support the next stage.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="/register"
                className="orange-gradient inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-200/70 transition hover:-translate-y-0.5"
              >
                Get started
                <span aria-hidden="true">
                  →
                </span>
              </a>

              <a
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white/70 px-6 py-3.5 text-sm font-semibold text-stone-700 transition hover:bg-white"
              >
                Already have an account?
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200/70 bg-white/40">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <a
            href="/"
            className="flex items-center gap-3"
          >
            <BrandMark />

            <span className="font-bold tracking-tight text-stone-800">
              Synaptix
            </span>
          </a>

          <p className="text-xs text-stone-500">
            Academic clarity for coaching institutes.
          </p>

          <p className="text-xs text-stone-400">
            © 2026 Synaptix. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}