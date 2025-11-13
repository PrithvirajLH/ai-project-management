import { Sidebar } from "@/components/sidebar"

const WorkspaceLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="max-w-6xl 2xl:max-w-7xl mx-auto">
        <div className="flex gap-x-7">
            <div className="w-64 shrink-0 hidden md:block">
                <Sidebar storageKey="t=workspace-sidebar-state" />
            </div>
            {children}
        </div>
    </main>
  )
}

export default WorkspaceLayout