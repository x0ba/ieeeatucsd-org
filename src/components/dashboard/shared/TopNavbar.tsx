import React, { useState, useEffect } from "react";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar,
  Badge,
  Button,
} from "@heroui/react";
import {
  Home,
  Calendar,
  CreditCard,
  Settings,
  LogOut,
  Users,
  DollarSign,
  Trophy,
  Banknote,
  FileText,
  MessageSquare,
  Link as LinkIcon,
  Briefcase,
  Building2,
  UserPlus,
  Bell,
  User,
  Award,
  ChevronDown,
} from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { getFirestore, doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { auth } from "../../../firebase/client";
import type { NavigationCategory } from "./types/navigation";
import type { UserRole } from "./types/firestore";
import { NAVIGATION_PATHS } from "./types/navigation";

interface TopNavbarProps {
  currentPath?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type: string;
}

interface UserType {
  name: string;
  email: string;
  points?: number;
  role?: UserRole;
  sponsorTier?: string;
}

const navigationCategories: NavigationCategory[] = [
  {
    title: "Member Actions",
    items: [
      { icon: Home, label: "Overview", href: NAVIGATION_PATHS.OVERVIEW },
      { icon: LinkIcon, label: "Links", href: NAVIGATION_PATHS.LINKS },
      { icon: Calendar, label: "Events", href: NAVIGATION_PATHS.EVENTS },
      {
        icon: CreditCard,
        label: "Reimbursement",
        href: NAVIGATION_PATHS.REIMBURSEMENT,
      },
      {
        icon: Trophy,
        label: "Leaderboard",
        href: NAVIGATION_PATHS.LEADERBOARD,
      },
    ],
  },
  {
    title: "General Officers",
    requiresRole: ["General Officer", "Executive Officer", "Administrator"],
    items: [
      {
        icon: Calendar,
        label: "Manage Events",
        href: NAVIGATION_PATHS.MANAGE_EVENTS,
      },
      {
        icon: Banknote,
        label: "Fund Deposits",
        href: NAVIGATION_PATHS.FUND_DEPOSITS,
      },
      {
        icon: MessageSquare,
        label: "Slack Access",
        href: NAVIGATION_PATHS.SLACK_ACCESS,
      },
      {
        icon: Trophy,
        label: "Officer Leaderboard",
        href: NAVIGATION_PATHS.OFFICER_LEADERBOARD,
      },
    ],
  },
  {
    title: "Executive Officers",
    requiresRole: ["Executive Officer", "Administrator"],
    items: [
      {
        icon: DollarSign,
        label: "Manage Reimbursements",
        href: NAVIGATION_PATHS.MANAGE_REIMBURSEMENTS,
      },
      {
        icon: Users,
        label: "Manage Users",
        href: NAVIGATION_PATHS.MANAGE_USERS,
      },
      {
        icon: Building2,
        label: "Manage Sponsors",
        href: NAVIGATION_PATHS.MANAGE_SPONSORS,
      },
      {
        icon: UserPlus,
        label: "Onboarding",
        href: NAVIGATION_PATHS.ONBOARDING,
      },
      {
        icon: FileText,
        label: "Constitution Builder",
        href: NAVIGATION_PATHS.CONSTITUTION_BUILDER,
      },
    ],
  },
  {
    title: "Sponsors",
    requiresRole: ["Sponsor", "Administrator"],
    items: [
      {
        icon: Briefcase,
        label: "Resume Database",
        href: NAVIGATION_PATHS.RESUME_DATABASE,
      },
      {
        icon: Building2,
        label: "Sponsor Information",
        href: NAVIGATION_PATHS.SPONSOR_INFORMATION,
      },
    ],
  },
];

export function TopNavbar({ currentPath = "" }: TopNavbarProps) {
  const [user, userLoading] = useAuthState(auth);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [sponsorTier, setSponsorTier] = useState<string | null>(null);
  const [isLoadingRole, setIsLoadingRole] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userData, setUserData] = useState<UserType | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const db = getFirestore();

  useEffect(() => {
    if (userLoading) return;

    if (!user) {
      setCurrentUserRole("Member");
      setIsLoadingRole(false);
      return;
    }

    if (user && currentUserRole === null) {
      const fetchUserRole = async () => {
        try {
          setIsLoadingRole(true);
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setCurrentUserRole(data.role || "Member");
            setSponsorTier(data.sponsorTier || null);
            setUserData({
              name: data.name || "User",
              email: data.email || user.email || "",
              points: data.points || 0,
              role: data.role || "Member",
            });
          } else {
            setCurrentUserRole("Member");
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setCurrentUserRole("Member");
        } finally {
          setIsLoadingRole(false);
        }
      };

      fetchUserRole();
    }
  }, [user, userLoading, currentUserRole, db]);

  // Fetch notifications
  useEffect(() => {
    if (!user) return;

    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notifs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      })) as Notification[];

      setNotifications(notifs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
      setUnreadCount(notifs.filter((n) => !n.read).length);
    });

    return () => unsubscribe();
  }, [user, db]);

  const isActiveRoute = (href: string): boolean => {
    if (currentPath === "/dashboard" || currentPath === "/dashboard/") {
      return href === NAVIGATION_PATHS.OVERVIEW;
    }
    return currentPath === href;
  };

  const canAccessCategory = (category: NavigationCategory): boolean => {
    if (!category.requiresRole || !currentUserRole) return true;
    return category.requiresRole.includes(currentUserRole);
  };

  const isLoading = userLoading || isLoadingRole || currentUserRole === null;

  const filteredCategories = currentUserRole
    ? navigationCategories.filter(canAccessCategory)
    : [];

  // Flatten all navigation items for desktop display
  const allNavItems = filteredCategories.flatMap((category) =>
    category.items.filter((item) => {
      // Hide Resume Database for Bronze tier sponsors
      if (
        item.href === NAVIGATION_PATHS.RESUME_DATABASE &&
        currentUserRole === "Sponsor" &&
        sponsorTier === "Bronze"
      ) {
        return false;
      }
      return true;
    })
  );

  return (
    <Navbar
      isMenuOpen={isMenuOpen}
      onMenuOpenChange={setIsMenuOpen}
      maxWidth="full"
      className="bg-[#0A2463]"
      classNames={{
        wrapper: "px-4 sm:px-6",
        item: "text-white data-[active=true]:text-white",
      }}
    >
      {/* Brand */}
      <NavbarContent justify="start">
        <NavbarBrand>
          <a href="/dashboard/overview" className="flex items-center gap-2 group">
            <img
              src="/logos/blue_logo_only.svg"
              alt="IEEE UCSD Logo"
              className="w-8 h-8 transition-transform group-hover:scale-105 brightness-0 invert"
            />
            <span className="text-xl font-bold text-white hidden sm:block">
              IEEE UCSD
            </span>
          </a>
        </NavbarBrand>
      </NavbarContent>

      {/* Desktop Navigation Links */}
      <NavbarContent className="hidden lg:flex gap-1" justify="center">
        {!isLoading &&
          allNavItems.slice(0, 6).map((item, index) => {
            const isActive = isActiveRoute(item.href);
            const Icon = item.icon;
            return (
              <NavbarItem key={index} isActive={isActive}>
                <a
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    isActive
                      ? "bg-white/20 text-white font-semibold"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{item.label}</span>
                </a>
              </NavbarItem>
            );
          })}

        {/* More dropdown for additional items */}
        {!isLoading && allNavItems.length > 6 && (
          <Dropdown>
            <NavbarItem>
              <DropdownTrigger>
                <Button
                  disableRipple
                  className="p-0 bg-transparent data-[hover=true]:bg-white/10 text-white/80 hover:text-white"
                  endContent={<ChevronDown className="w-4 h-4" />}
                  radius="sm"
                  variant="light"
                >
                  More
                </Button>
              </DropdownTrigger>
            </NavbarItem>
            <DropdownMenu aria-label="More navigation items">
              {allNavItems.slice(6).map((item, index) => {
                const Icon = item.icon;
                return (
                  <DropdownItem
                    key={index}
                    startContent={<Icon className="w-4 h-4" />}
                    href={item.href}
                  >
                    {item.label}
                  </DropdownItem>
                );
              })}
            </DropdownMenu>
          </Dropdown>
        )}
      </NavbarContent>

      {/* Right side - Notifications & Profile */}
      <NavbarContent justify="end">
        {/* Notifications */}
        <Dropdown placement="bottom-end">
          <NavbarItem>
            <DropdownTrigger>
              <Button
                isIconOnly
                variant="light"
                className="text-white hover:bg-white/10"
                aria-label="Notifications"
              >
                <Badge content={unreadCount > 0 ? unreadCount : ""} color="danger" size="sm">
                  <Bell className="w-5 h-5" />
                </Badge>
              </Button>
            </DropdownTrigger>
          </NavbarItem>
          <DropdownMenu aria-label="Notifications" className="w-80">
            {notifications.length === 0 ? (
              <DropdownItem key="no-notifications" className="cursor-default">
                No notifications
              </DropdownItem>
            ) : (
              notifications.slice(0, 5).map((notif) => (
                <DropdownItem key={notif.id} className="py-2">
                  <div className="flex flex-col gap-1">
                    <p className="font-semibold text-sm">{notif.title}</p>
                    <p className="text-xs text-gray-600">{notif.message}</p>
                  </div>
                </DropdownItem>
              ))
            )}
          </DropdownMenu>
        </Dropdown>

        {/* Profile Dropdown */}
        <Dropdown placement="bottom-end">
          <NavbarItem>
            <DropdownTrigger>
              <Button
                isIconOnly
                variant="light"
                className="text-white hover:bg-white/10"
                aria-label="Profile"
              >
                <User className="w-5 h-5" />
              </Button>
            </DropdownTrigger>
          </NavbarItem>
          <DropdownMenu aria-label="Profile Actions" variant="flat">
            <DropdownItem key="profile" className="h-14 gap-2" textValue="Profile">
              <p className="font-semibold">{userData?.name || "User"}</p>
              <p className="text-sm text-gray-500">{userData?.email}</p>
            </DropdownItem>
            <DropdownItem
              key="points"
              startContent={<Award className="w-4 h-4 text-yellow-600" />}
              textValue="Points"
            >
              <div className="flex justify-between items-center">
                <span>Points</span>
                <span className="font-bold text-yellow-600">{userData?.points || 0}</span>
              </div>
            </DropdownItem>
            <DropdownItem
              key="settings"
              startContent={<Settings className="w-4 h-4" />}
              href={NAVIGATION_PATHS.SETTINGS}
            >
              Settings
            </DropdownItem>
            <DropdownItem
              key="logout"
              startContent={<LogOut className="w-4 h-4" />}
              href={NAVIGATION_PATHS.SIGNOUT}
              className="text-danger"
              color="danger"
            >
              Sign Out
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>

        {/* Mobile Menu Toggle */}
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className="lg:hidden text-white"
        />
      </NavbarContent>

      {/* Mobile Menu */}
      <NavbarMenu className="pt-6 bg-white">
        {!isLoading &&
          filteredCategories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
                {category.title}
              </p>
              {category.items
                .filter((item) => {
                  if (
                    item.href === NAVIGATION_PATHS.RESUME_DATABASE &&
                    currentUserRole === "Sponsor" &&
                    sponsorTier === "Bronze"
                  ) {
                    return false;
                  }
                  return true;
                })
                .map((item, index) => {
                  const isActive = isActiveRoute(item.href);
                  const Icon = item.icon;
                  return (
                    <NavbarMenuItem key={index} isActive={isActive}>
                      <a
                        href={item.href}
                        className={`flex items-center gap-3 px-2 py-2.5 rounded-lg transition-all w-full ${
                          isActive
                            ? "bg-blue-50 text-blue-700 font-semibold"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </a>
                    </NavbarMenuItem>
                  );
                })}
            </div>
          ))}
      </NavbarMenu>
    </Navbar>
  );
}

