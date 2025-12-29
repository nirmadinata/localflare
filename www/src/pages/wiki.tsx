import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { WikiSidebar } from '@/components/wiki/wiki-sidebar';
import { WikiContent } from '@/components/wiki/wiki-content';

export function WikiPage() {
  const { section } = useParams();
  const [activeSection, setActiveSection] = useState(section || 'getting-started');

  return (
    <div className="fixed inset-0 z-50 flex bg-[#fffaf5] text-zinc-900">
      {/* Sidebar */}
      <WikiSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {/* Header - minimal */}
        <header className="flex h-12 items-center justify-between px-8 border-b border-zinc-200">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs text-zinc-600 transition-colors hover:text-zinc-900"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={2} />
            Home
          </Link>
          <span className="text-xs text-zinc-600">Localflare Docs</span>
        </header>

        {/* Content area */}
        <div className="h-[calc(100%-3rem)] overflow-y-auto">
          <div className="mx-auto max-w-2xl px-8 py-12">
            <WikiContent activeSection={activeSection} />
          </div>
        </div>
      </main>
    </div>
  );
}
