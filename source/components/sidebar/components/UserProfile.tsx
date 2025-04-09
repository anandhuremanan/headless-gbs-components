import { MenuData } from "../type";

type UserProfileProps = {
  profile: MenuData["profile"];
};

export const UserProfile = ({ profile }: UserProfileProps) => {
  if (!profile) return null;

  return (
    <div className="border-t border-gray-200 px-4 py-3 flex flex-col gap-2">
      <div className="flex">
        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center mr-3">
          <span className="text-xs font-medium">
            {profile?.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </span>
        </div>
        <div className="flex-grow">
          <div className="text-sm font-medium text-gray-700">
            {profile?.name}
          </div>
          <div className="text-xs text-gray-400">{profile?.email}</div>
        </div>
      </div>
      <div className="text-xs text-gray-400">© 2024 Sequence Inc.</div>
    </div>
  );
};
