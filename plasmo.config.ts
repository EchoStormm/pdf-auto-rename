import type { PlasmoCSConfig } from "plasmo"

export default {
  manifest: {
    permissions: [
      "downloads",
      "storage",
      "downloads.open",
      "downloads.shelf",
      "downloads.ui",
      "downloads.write",
      "permissions"
    ],
    optional_permissions: [
      "notifications"
    ],
    host_permissions: [
      "https://api.openai.com/*",
      "<all_urls>"
    ]
  },
  style: {
    postcss: {
      plugins: [
        require("tailwindcss"),
        require("autoprefixer"),
        require("postcss-import")
      ]
    }
  }
} as PlasmoCSConfig 