import { LogOut, Settings } from "lucide-react";

export function SidebarSessionFooter() {
  return (
    <div className="space-y-1">
      <a
        href="/refinar"
        className="flex w-full items-center gap-3 p-2 text-left font-headline text-xs font-bold uppercase tracking-widest text-on-surface-variant transition hover:text-primary"
      >
        <Settings size={16} />
        <span>Perfil y avatar</span>
      </a>
      <a
        href="/api/auth/login"
        className="flex w-full items-center gap-3 p-2 font-headline text-xs font-bold uppercase tracking-widest text-outline transition hover:text-primary"
      >
        <LogOut size={16} />
        <span>Acceso con GitHub</span>
      </a>
    </div>
  );
}
