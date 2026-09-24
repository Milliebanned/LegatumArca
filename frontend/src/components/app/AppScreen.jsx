import { useCallback, useState } from "react";
import { useWeb3 } from "../../Web3Context.jsx";
import CreateVault from "../CreateVault.jsx";
import { AppBoard } from "./AppShell.jsx";
import DashboardHome from "./DashboardHome.jsx";
import { MobileAppBoard } from "./MobileShell.jsx";
import MobileDashboardHome from "./MobileDashboardHome.jsx";
import { BeneficiariesDialog, DepositDialog } from "./Modals.jsx";
import { ActivityPage, BeneficiariesPage, SettingsPage, VaultsPage, nameKey, readDisplayName } from "./Pages.jsx";
import { shortAddress } from "./format.js";
import { useNow, useOwnerVaults } from "./useVaults.js";
import { dashboardProps, needsAttention } from "./viewModel.js";

const PAGE_TOP = {
  vaults: { kicker: "Manage", title: "Vaults", subtitle: "Every vault you own and what each one holds." },
  beneficiaries: {
    kicker: "People",
    title: "Beneficiaries",
    subtitle: "Who inherits from your vaults, and vaults that name you.",
  },
  activity: { kicker: "History", title: "Activity", subtitle: "Everything recorded on-chain across your vaults." },
  settings: { kicker: "Account", title: "Settings", subtitle: "Your wallet, network and display name." },
  create: { kicker: "New vault", title: "Create a Vault", subtitle: "Name it, split it between people, fund it." },
};

// The connected app: the dashboard artboard (desktop or mobile) plus the
// pages its navigation and Quick Actions lead to.
export default function AppScreen({ mobile, onDisconnect }) {
  const { address } = useWeb3();
  const { vaults, error, reload } = useOwnerVaults();
  const now = useNow();
  const [page, setPage] = useState("dashboard");
  const [selectedVault, setSelectedVault] = useState(null);
  const [focusSearch, setFocusSearch] = useState(0);
  const [dialog, setDialog] = useState(null); // { kind: "deposit" | "beneficiaries", vault? }
  const [displayName, setDisplayName] = useState(() => readDisplayName(address));

  const list = vaults ?? [];
  const navigate = useCallback((id) => setPage(id), []);
  const openVault = (vaultAddress) => {
    setSelectedVault(vaultAddress);
    setPage("vaults");
  };
  const editBeneficiaries = (vault) => setDialog({ kind: "beneficiaries", vault });
  const goCreate = () => {
    setDialog(null);
    setPage("create");
  };

  const saveName = (name) => {
    setDisplayName(name);
    try {
      if (name) localStorage.setItem(nameKey(address), name);
      else localStorage.removeItem(nameKey(address));
    } catch {
      // Storage unavailable (private window): the name just won't persist.
    }
  };

  const loading = vaults === null;
  const top = {
    ...(page === "dashboard"
      ? {
          kicker: "Good morning,",
          title: displayName || shortAddress(address),
          subtitle: "Your legacy is protected.",
        }
      : PAGE_TOP[page]),
    walletLabel: shortAddress(address),
    attention: needsAttention(list, now),
    onSearch: () => {
      setPage("vaults");
      setFocusSearch((n) => n + 1);
    },
    onNotifications: () => setPage("activity"),
    walletMenu: (
      <>
        <div className="db-menu-note">{address}</div>
        <button role="menuitem" onClick={() => navigator.clipboard?.writeText(address)}>
          Copy address
        </button>
        <button role="menuitem" onClick={() => setPage("settings")}>
          Settings
        </button>
        <button role="menuitem" onClick={onDisconnect}>
          Disconnect
        </button>
      </>
    ),
  };

  let content;
  if (loading || error) {
    content = (
      <div className="db-page db-ui">
        <p className="muted" style={{ color: error ? "#FF6B7F" : "#87868a", fontSize: 14 }}>
          {error ?? "Loading your vaults…"}
        </p>
      </div>
    );
  } else if (page === "dashboard") {
    const Home = mobile ? MobileDashboardHome : DashboardHome;
    content = (
      <Home
        data={dashboardProps(list, now)}
        actions={{
          onViewAll: () => setPage("vaults"),
          onOpenVault: openVault,
          onCreate: goCreate,
          onDeposit: () => setDialog({ kind: "deposit" }),
          // Desktop's button reads "Add Beneficiaries" and opens the editor;
          // mobile's reads "Beneficiaries" and opens that page.
          onBeneficiaries: mobile ? () => setPage("beneficiaries") : () => setDialog({ kind: "beneficiaries" }),
          onActivity: () => setPage("activity"),
        }}
      />
    );
  } else if (page === "vaults") {
    content = (
      <VaultsPage
        mobile={mobile}
        vaults={list}
        now={now}
        selected={selectedVault}
        onSelect={setSelectedVault}
        focusSearch={focusSearch}
        reload={reload}
        onEditBeneficiaries={editBeneficiaries}
        onCreate={goCreate}
      />
    );
  } else if (page === "beneficiaries") {
    content = <BeneficiariesPage vaults={list} now={now} onEditBeneficiaries={editBeneficiaries} />;
  } else if (page === "activity") {
    content = <ActivityPage mobile={mobile} vaults={list} />;
  } else if (page === "settings") {
    content = <SettingsPage displayName={displayName} onDisplayName={saveName} onDisconnect={onDisconnect} />;
  } else {
    content = (
      <div className="db-page db-ui">
        <div style={{ maxWidth: 640 }}>
          <CreateVault
            onCreated={async (vaultAddress) => {
              await reload();
              openVault(vaultAddress);
            }}
          />
        </div>
      </div>
    );
  }

  const dialogProps = { vaults: list, initialVault: dialog?.vault, onClose: () => setDialog(null), onCreate: goCreate, reload };
  const overlay =
    dialog?.kind === "deposit" ? (
      <DepositDialog {...dialogProps} />
    ) : dialog?.kind === "beneficiaries" ? (
      <BeneficiariesDialog {...dialogProps} />
    ) : null;

  if (mobile) {
    return (
      <MobileAppBoard
        tab={page === "create" ? "vaults" : page}
        onNavigate={navigate}
        top={top}
        overlay={overlay}
      >
        {page === "dashboard" && !loading && !error ? content : <div className="dbm-page">{content}</div>}
      </MobileAppBoard>
    );
  }

  return (
    <AppBoard page={page === "create" ? "vaults" : page} onNavigate={navigate} top={top} overlay={overlay}>
      {content}
    </AppBoard>
  );
}
