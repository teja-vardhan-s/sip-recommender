import axios from "axios";
import { MutualFundsRepository } from "../repositories/mutualFundsRepository.js";
import { normalizeCategory } from "../utils/normalizeCategory.js";

export const FundSyncService = {

    async sync() {
        console.log("📥 Fetching AMFI fund list...");

        const { data } = await axios.get(
            "https://www.amfiindia.com/spages/NAVAll.txt",
            { responseType: "text" }
        );

        const lines = data.split("\n");

        let currentSection = null;
        let count = 0;

        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line.includes(";")) {
                // category heading found
                currentSection = line;
                continue;
            }

            const parts = line.split(";");
            if (parts.length < 6) continue;

            const scheme_code = parts[0].trim();
            const scheme_name = parts[3].trim();
            const nav = parseFloat(parts[4]?.trim());
            const updated_at = parts[5]?.trim();

            const category = normalizeCategory(currentSection);

            if (!scheme_code || !scheme_name || isNaN(nav)) continue;

            await MutualFundsRepository.upsertFund({
                scheme_code,
                fund_name: scheme_name,
                category,
                nav,
                nav_updated_at: new Date(updated_at),
            });

            count++;
        }

        console.log(`✅ Fund sync complete: ${count} funds processed.`);
        return count;
    },

};
