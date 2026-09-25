import type { Socket } from "socket.io-client";

export function getSelectedDashboardBranchId(): string | null {
  try {
    const branchId = localStorage.getItem("branch_id");
    return branchId && branchId.trim() ? branchId.trim() : null;
  } catch {
    return null;
  }
}

export function joinDashboardSocketRooms(socket: Socket | null | undefined) {
  if (!socket) return;

  const branchId = getSelectedDashboardBranchId();
  if (!branchId || branchId === "all") {
    socket.emit("join_admin");
    return;
  }

  socket.emit("join_branch", branchId);
}

export function bindDashboardSocketRooms(socket: Socket | null | undefined) {
  if (!socket) {
    return () => undefined;
  }

  const join = () => joinDashboardSocketRooms(socket);
  join();
  socket.on("connect", join);

  return () => {
    socket.off("connect", join);
  };
}
