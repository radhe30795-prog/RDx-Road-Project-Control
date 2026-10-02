-- 0026: Split GSB and WMM into separate activities
-- GSB and WMM are separate BOQ entities (different item codes, rates, quantities, timelines).
-- This creates a dedicated WMM activity per road and renames the combined GSB activity.

-- Insert a new WMM activity for each road that has a combined "GSB & WMM" activity
INSERT INTO `activities` (`taskId`, `projectId`, `roadId`, `phase`, `activityName`, `startDate`, `endDate`, `percentageComplete`, `status`, `priority`)
SELECT
  CONCAT(`taskId`, '-WMM'),
  `projectId`,
  `roadId`,
  'WMM',
  'Wet Mix Macadam',
  `startDate`,
  `endDate`,
  '0.00',
  'Not Started',
  `priority`
FROM `activities`
WHERE `phase` = 'GSB'
  AND `activityName` LIKE '%WMM%'
  AND NOT EXISTS (
    SELECT 1 FROM `activities` AS `a2`
    WHERE `a2`.`roadId` = `activities`.`roadId`
      AND `a2`.`phase` = 'WMM'
  );

-- Rename the combined GSB activity to just "Granular Sub-base"
UPDATE `activities`
SET `activityName` = 'Granular Sub-base'
WHERE `phase` = 'GSB'
  AND `activityName` LIKE '%WMM%';
