import { 
  Layout, 
  MessageSquare, 
  Users, 
  Settings, 
  UserCircle,
  Bot
} from "lucide-react";

export const dashboardNav = [
  {
    title: "Avatar Test",
    label: "New",
    icon: Bot,
    variant: "ghost",
    href: "/avatar-test",
  },
  {
    title: "Workspaces",
    icon: Layout,
    variant: "ghost",
    href: "/dashboard",
  },
  {
    title: "Conversations",
    icon: MessageSquare,
    variant: "ghost",
    href: "/conversations",
  },
  {
    title: "Friends",
    icon: Users,
    variant: "ghost",
    href: "/friends",
  },
  {
    title: "Settings",
    icon: Settings,
    variant: "ghost",
    href: "/settings",
  },
  {
    title: "Profile",
    icon: UserCircle,
    variant: "ghost",
    href: "/profile",
  },
]; 