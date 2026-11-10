-- Reward prices four times higher, as the product owner asked on 2026-11-10 (coffee 40 -> 160).
-- Challenge points, balances, past redemptions and unlocks are not touched: only the price to redeem.
-- Explicit values, so running this again changes nothing. It runs after the catalog seed in
-- 20261108090000_points_rewards.sql, so re-running every migration still ends with these prices.
update public.rewards as r
set required_points = v.points
from (values ('dunkin', 160), ('jarir', 320), ('vox', 480), ('extra', 600)) as v(id, points)
where r.id = v.id and r.required_points <> v.points;
