export default function InferredSiteDetail({ id }: { id: string }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-100">
        Inferred site · {id}
      </h2>
      <p className="text-xs leading-relaxed text-zinc-300">
        Patrol-loop inference is a Scenario 2 feature. Not yet wired in the
        Wadi Hamrin tape — see the polish phase.
      </p>
    </div>
  );
}
