import * as React from "react";
import { createRoot } from "react-dom/client";
import { useState, useEffect, useRef } from "react";

export default function UserManagenent() {
    return <>Hello World</>;
}

const container = document.getElementById("mount-user-management-here");
const root = createRoot(container!);
root.render(<UserManagenent />);
