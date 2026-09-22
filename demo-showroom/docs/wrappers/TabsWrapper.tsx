"use client";

import { useState } from "react";
import {
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from "../../../source/beta-components/tabs";

/** Live example used in the Tabs documentation. */
export function TabsWrapper() {
  const [tab, setTab] = useState("overview");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 520,
      }}
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabList aria-label="Project">
          <Tab value="overview">Overview</Tab>
          <Tab value="activity" badge={3}>
            Activity
          </Tab>
          <Tab value="settings">Settings</Tab>
          <Tab value="archive" disabled>
            Archive
          </Tab>
        </TabList>
        <TabPanel value="overview">
          Focus a tab and use the arrow keys to move between tabs.
        </TabPanel>
        <TabPanel value="activity">
          3 new comments since your last visit.
        </TabPanel>
        <TabPanel value="settings">Settings live here.</TabPanel>
      </Tabs>
      <code style={{ fontSize: 12, opacity: 0.7 }}>
        value: {JSON.stringify(tab)}
      </code>
    </div>
  );
}

export default TabsWrapper;
