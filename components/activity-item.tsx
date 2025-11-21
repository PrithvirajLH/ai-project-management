import { AuditLog } from "@/types";
import { generateLogMessage } from "@/lib/generate-log-message";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

function getInitials(name?: string | null) {
    if (!name) return "?"
    
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("")
}

interface ActivityItemProps {
    data: AuditLog;
}

export const ActivityItem = ({ data }: ActivityItemProps) => {
return(
    <li className="flex items-start gap-x-3 rounded-lg border border-border/40 bg-card/40 p-3.5 hover:bg-card/60 hover:border-border/60 transition-all duration-200 hover:shadow-sm group">
        <Avatar className="h-9 w-9 border-2 border-background shadow-sm transition-transform duration-200 group-hover:scale-105">
            <AvatarImage src={data.userImage ?? undefined} />
            <AvatarFallback className="text-xs font-medium">
                {getInitials(data.username)}
            </AvatarFallback> 
        </Avatar>
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <p className="text-sm text-foreground leading-relaxed">
                <span className="font-semibold text-foreground transition-colors duration-200">{data.username} </span>
                {generateLogMessage(data)}
            </p>
            <p className="text-xs text-muted-foreground">
                {format(new Date(data.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </p>
        </div>
    </li>
)
}