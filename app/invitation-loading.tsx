import CarSpinner from "./car-spinner";

const checker = "repeating-conic-gradient(#111 0% 25%, #fff 0% 50%) 50% / 28px 28px";

/** Loading state for the Invitation page and the Shared link page: the checkered flag frame with the car spinner. */
export default function InvitationLoading() {
  return (
    <main className="min-h-screen bg-zinc-900 text-white">
      <div className="h-7" style={{ background: checker }} />
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-zinc-300 [&_span]:!text-zinc-300">
          <CarSpinner size={140} />
        </div>
      </div>
      <div className="h-7" style={{ background: checker }} />
    </main>
  );
}
