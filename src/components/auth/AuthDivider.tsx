export function AuthDivider() {
  return (
    <div className="relative my-4">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-white/15" />
      </div>
      <div className="relative flex justify-center text-xs tracking-wide uppercase">
        <span className="bg-transparent px-2 text-blue-100/50">or continue with</span>
      </div>
    </div>
  );
}
