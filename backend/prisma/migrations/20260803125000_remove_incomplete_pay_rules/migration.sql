-- Tillægsregler uden en eneste version blev kun efterladt af det tidligere
-- todelte oprettelsesflow. De har aldrig kunnet påvirke lønberegningen og
-- fjernes, før det atomiske oprettelsesflow tages i brug.
DELETE FROM "PayRule" AS rule
WHERE NOT EXISTS (
  SELECT 1
  FROM "PayRuleVersion" AS version
  WHERE version."payRuleId" = rule."id"
)
AND NOT EXISTS (
  SELECT 1
  FROM "PayrollConfigurationChange" AS change
  WHERE change."payRuleId" = rule."id"
);
