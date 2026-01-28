import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Button,
} from "@heroui/react";
import { Home, Settings, LogOut } from "lucide-react";
import { useAuth } from "../../../hooks/useConvexAuth";
import { NAVIGATION_PATHS } from "./types/navigation";

interface TopNavbarProps {
  currentPath?: string;
}

export default function TopNavbar({ }: TopNavbarProps) {
  const { } = useAuth();

  const handleSignOut = async () => {
    // For now, redirect to signin
    // In full implementation, would use auth.signOut()
    window.location.href = "/dashboard-v2/signin";
  };

  return (
    <Navbar
      maxWidth="full"
      className="bg-white border-b border-gray-200"
      classNames={{
        wrapper: "px-4 sm:px-6",
      }}
    >
      {/* Brand */}
      <NavbarContent justify="start">
        <NavbarBrand>
          <a href={NAVIGATION_PATHS.OVERVIEW} className="flex items-center gap-2 group">
            <img
              src="/logos/blue_logo_only.svg"
              alt="IEEE UCSD Logo"
              className="w-8 h-8 transition-transform group-hover:scale-105"
            />
            <span className="text-lg font-bold text-gray-900">
              IEEE UCSD
            </span>
          </a>
        </NavbarBrand>
      </NavbarContent>

      {/* Center - Basic navigation */}
      <NavbarContent justify="center">
        <NavbarItem>
          <Button
            as="a"
            href={NAVIGATION_PATHS.OVERVIEW}
            variant="light"
            startContent={<Home className="w-4 h-4" />}
          >
            Overview
          </Button>
        </NavbarItem>
      </NavbarContent>

      {/* Right side */}
      <NavbarContent justify="end">
        <NavbarItem>
          <Button
            as="a"
            href={NAVIGATION_PATHS.SETTINGS}
            variant="light"
            startContent={<Settings className="w-4 h-4" />}
          >
            Settings
          </Button>
        </NavbarItem>
        <NavbarItem>
          <Button
            onPress={handleSignOut}
            variant="light"
            startContent={<LogOut className="w-4 h-4" />}
            className="text-red-600"
          >
            Sign Out
          </Button>
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
}
