import { Sidebar } from "@/components/sidebar"

const WorkspaceLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="w-full">
      <div className="flex gap-x-7">
        <div className="hidden w-64 shrink-0 md:block">
          <Sidebar storageKey="t=workspace-sidebar-state" />
        </div>
        {children}
      </div>
    </main>
  )
}

export default WorkspaceLayout