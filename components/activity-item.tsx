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
    <li className="flex items-start gap-x-2">
        <Avatar className="h-8 w-8">
            <AvatarImage src={data.userImage ?? undefined} />
            <AvatarFallback>
                {getInitials(data.username)}
            </AvatarFallback> 
        </Avatar>
        <div className="flex flex-col">
            <p className="text-sm text-muted-foreground">
                <span className="font-semibold lowercase text-neutral-700">{data.username} </span>
                {generateLogMessage(data)}
            </p>
            <p className="text-xs text-muted-foreground">
                {format(new Date(data.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </p>
        </div>
    </li>
)
}