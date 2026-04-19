import React from "react";

import Dashboard from "../pages/Dashboard";
import Agents from "../pages/Agents";
import Users from "../pages/Users";
import UserPermissions from "../pages/UserPermissions";

export const appRoutes = [
  {
    path: "/",
    key: "dashboard",
    element: <Dashboard />,
  },
  {
    path: "/agents",
    key: "agents",
    element: <Agents />,
  },
  {
    path: "/users",
    key: "users",
    element: <Users />,
  },
  {
    path: "/users/permissions",
    key: "users",
    element: <UserPermissions />,
  },
];
