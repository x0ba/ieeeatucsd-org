import { api } from "#convex/_generated/api";
import { useQuery, useMutation } from "convex/react";

export class PublicProfileService {
  static getProfile(userId: string) {
    return useQuery(api.users.getUserProfile, { userId });
  }

  static getPublicProfiles() {
    return useQuery(api.users.getPublicProfiles);
  }

  static updateUserStats() {
    return useMutation(api.users.updateUserStats);
  }
}
