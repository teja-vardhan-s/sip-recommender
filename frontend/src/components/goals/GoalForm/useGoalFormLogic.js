// frontend/src/components/goals/useGoalFormLogic.js
import { useEffect, useState, useRef, useCallback } from "react";
import api from "../../../utils/api.js";

/**
 * useGoalFormLogic
 *
 * Params:
 *  - isEditing (bool)
 *  - goal_id (number|null)
 *  - onCreated (fn) optional callback after create
 *  - onUpdated (fn) optional callback after update
 *
 * Returns an object containing form state, setters and action handlers
 * that the presentational components can use.
 */
export default function useGoalFormLogic({ isEditing = false, goal_id = null, onCreated = null, onUpdated = null } = {}) {
    // Basic goal fields
    const [name, setName] = useState("");
    const [targetAmount, setTargetAmount] = useState("");
    const [targetDate, setTargetDate] = useState(() => {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 3);
        return d.toISOString().slice(0, 10);
    });
    const [expectedReturnRate, setExpectedReturnRate] = useState(0.08);

    // Calculation result
    const [calcResult, setCalcResult] = useState(null);
    const [monthsNeeded, setMonthsNeeded] = useState(null);

    // Create SIP section
    const [createSIP, setCreateSIP] = useState(false);
    const [fund, setFund] = useState(null); // { scheme_code, fund_name, expected_return ... }
    const [sipAmount, setSipAmount] = useState("");
    const [sipStart, setSipStart] = useState(() => new Date().toISOString().slice(0, 10));

    // Loading / fetching states
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    // For edit-mode restore behavior
    const originalRef = useRef(null);

    // Utility: months between two ISO date strings (rounded down)
    const monthsBetweenDates = useCallback((startIso, endIso) => {
        const s = new Date(startIso);
        const e = new Date(endIso);
        return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    }, []);

    // Helper: parse a variety of calculate endpoint shapes
    const parseMonthly = useCallback((resp) => {
        const d = resp?.data ?? resp;
        return (
            d?.monthly_investment ??
            d?.monthly ??
            d?.calculated_sip ??
            d?.requiredSIP ?? // some earlier example
            (d?.data && (d.data.monthly_investment ?? d.data.monthly ?? d.data.calculated_sip)) ??
            null
        );
    }, []);

    // Load existing goal when editing
    useEffect(() => {
        if (!isEditing || !goal_id) return;

        let cancelled = false;
        setFetching(true);

        (async () => {
            try {
                const res = await api.get(`/goals/${goal_id}`);
                if (cancelled) return;
                // defensive extraction
                const g = res.data?.data ?? res.data?.goal ?? res.data ?? null;
                if (!g) throw new Error("Malformed goal response from backend");

                const mapped = {
                    goal_id: g.goal_id ?? g.id ?? null,
                    name: g.name ?? "",
                    target_amount: Number(g.target_amount ?? g.targetAmount ?? 0),
                    target_date: g.target_date ?? g.targetDate ?? null,
                    expected_return: Number(g.expected_return ?? g.expectedReturn ?? g.expectedReturnRate ?? 0.08),
                    monthly_investment: Number(g.calculated_sip ?? g.monthly_investment ?? g.monthlyInvestment ?? 0),
                    investments: g.investments ?? g.sips ?? [],
                };

                // populate form fields
                setName(mapped.name);
                setTargetAmount(mapped.target_amount);
                if (mapped.target_date) {
                    // normalize date to yyyy-mm-dd
                    setTargetDate(new Date(mapped.target_date).toISOString().slice(0, 10));
                }
                setExpectedReturnRate(mapped.expected_return);
                setCalcResult(mapped.monthly_investment || null);

                // If goal has an investment, pre-fill SIP fields (optional convenience)
                if (mapped.investments?.length > 0) {
                    const inv = mapped.investments[0];
                    setSipAmount(Number(inv.invested_amount ?? inv.monthly ?? mapped.monthly_investment ?? 0));
                    if (inv.fund) setFund(inv.fund);
                }

                // remember original to support "Clear" restoring in edit mode
                originalRef.current = {
                    name: mapped.name,
                    targetAmount: mapped.target_amount,
                    targetDate: mapped.target_date ? new Date(mapped.target_date).toISOString().slice(0, 10) : null,
                    expectedReturnRate: mapped.expected_return,
                    calcResult: mapped.monthly_investment,
                    sipAmount: mapped.monthly_investment ?? sipAmount,
                    fund: fund,
                };
            } catch (err) {
                console.error("useGoalFormLogic: failed to load goal", err);
            } finally {
                if (!cancelled) setFetching(false);
            }
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditing, goal_id]);

    // When fund changes, auto update expected return and optionally sip amount
    useEffect(() => {
        if (!fund) return;
        if (fund.expected_return != null) {
            setExpectedReturnRate(Number(fund.expected_return));
        }
        // If a calc result exists and user hasn't manually set sipAmount, use it
        if (calcResult) {
            setSipAmount(calcResult);
        }
    }, [fund, calcResult]);

    // ACTION: calculate recommended SIP via backend
    const handleCalculate = useCallback(async (e) => {
        e?.preventDefault?.();
        setCalcResult(null);
        setMonthsNeeded(null);

        try {
            const body = {
                targetAmount: Number(targetAmount),
                targetDate,
                expectedReturn: Number(expectedReturnRate),
            };
            const res = await api.post("/goals/calculate", body);
            const recommended = parseMonthly(res) ?? null;
            setCalcResult(recommended);

            // months between now and target
            const months = monthsBetweenDates(new Date().toISOString(), targetDate);
            setMonthsNeeded(months);

            // auto-fill SIP when user intends to create SIP
            if (createSIP && recommended) {
                setSipAmount(recommended);
            }
        } catch (err) {
            console.error("useGoalFormLogic: calculate failed", err);
            alert(err?.response?.data?.error?.message ?? "Failed to calculate SIP");
        }
    }, [targetAmount, targetDate, expectedReturnRate, parseMonthly, monthsBetweenDates, createSIP]);

    // ACTION: clear the form (restore original in edit mode)
    const handleClear = useCallback(() => {
        if (isEditing && originalRef.current) {
            const o = originalRef.current;
            setName(o.name ?? "");
            setTargetAmount(o.targetAmount ?? "");
            if (o.targetDate) setTargetDate(o.targetDate);
            setExpectedReturnRate(o.expectedReturnRate ?? 0.08);
            setCalcResult(o.calcResult ?? null);
            setSipAmount(o.sipAmount ?? "");
            setFund(o.fund ?? null);
            setCreateSIP(false);
        } else {
            setName("");
            setTargetAmount("");
            const d = new Date(); d.setFullYear(d.getFullYear() + 3);
            setTargetDate(d.toISOString().slice(0, 10));
            setExpectedReturnRate(0.08);
            setCalcResult(null);
            setCreateSIP(false);
            setFund(null);
            setSipAmount("");
        }
    }, [isEditing]);

    // ACTION: create or update the goal, and optionally create a SIP linked to the goal
    const handleSubmit = useCallback(async (e) => {
        e?.preventDefault?.();
        setLoading(true);

        try {
            // prepare goal payload (backend shape defensive)
            const payloadForGoal = {
                name,
                targetAmount: Number(targetAmount),
                targetDate,
                expectedReturn: Number(expectedReturnRate),
                monthlyInvestment: calcResult ? Number(calcResult) : undefined,
            };

            let goalResp = null;
            if (isEditing && goal_id) {
                goalResp = await api.put(`/goals/${goal_id}`, payloadForGoal);
                onUpdated?.();
            } else {
                goalResp = await api.post("/goals", payloadForGoal);
                onCreated?.();
            }

            // determine resulting goal id (defensive)
            const createdGoalId =
                goalResp?.data?.goal_id ??
                goalResp?.data?.data?.goal_id ??
                goalResp?.data?.data?.id ??
                goalResp?.data?.goal?.goal_id ??
                goal_id ??
                null;

            // If user wants to create SIP for this goal
            if (createSIP && sipAmount && createdGoalId) {
                const months = monthsBetweenDates(new Date().toISOString(), targetDate);
                const sipPayload = {
                    scheme_code: fund?.scheme_code ?? undefined,
                    fund_name: fund?.fund_name ?? undefined,
                    invested_amount: Number(sipAmount),
                    frequency: "Monthly",
                    start_date: sipStart,
                    expected_return: Number(expectedReturnRate),
                    duration_months: months,
                    goal_id: createdGoalId,
                };

                await api.post("/sips", sipPayload);
            }

            // reset for create mode (keep edit mode as-is)
            if (!isEditing) {
                setName("");
                setTargetAmount("");
                const d = new Date(); d.setFullYear(d.getFullYear() + 3);
                setTargetDate(d.toISOString().slice(0, 10));
                setExpectedReturnRate(0.08);
                setCalcResult(null);
                setCreateSIP(false);
                setFund(null);
                setSipAmount("");
            }

            alert(isEditing ? "Goal saved" : "Goal created");
        } catch (err) {
            console.error("useGoalFormLogic: create/update failed", err);
            alert(err?.response?.data?.error?.message ?? "Failed to save goal");
        } finally {
            setLoading(false);
        }
    }, [
        name,
        targetAmount,
        targetDate,
        expectedReturnRate,
        calcResult,
        createSIP,
        sipAmount,
        sipStart,
        fund,
        isEditing,
        goal_id,
        onCreated,
        onUpdated,
        monthsBetweenDates,
    ]);

    return {
        // form state
        name,
        setName,
        targetAmount,
        setTargetAmount,
        targetDate,
        setTargetDate,
        expectedReturnRate,
        setExpectedReturnRate,

        // calculation results
        calcResult,
        monthsNeeded,

        // SIP config
        createSIP,
        setCreateSIP,
        fund,
        setFund,
        sipAmount,
        setSipAmount,
        sipStart,
        setSipStart,

        // loading states
        loading,
        fetching,

        // actions
        handleCalculate,
        handleClear,
        handleSubmit,

        // metadata
        isEditing,
        goal_id,
    };
}
