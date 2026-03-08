-- CreateTable
CREATE TABLE "elders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "livingStatus" TEXT NOT NULL,
    "chronicDiseases" JSONB NOT NULL,
    "emergencyContactName" TEXT NOT NULL,
    "emergencyContactPhone" TEXT NOT NULL,
    "emergencyContactRel" TEXT NOT NULL,
    "overallRisk" TEXT NOT NULL DEFAULT 'low',
    "lastVisitDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "elder_tags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "elderId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    CONSTRAINT "elder_tags_elderId_fkey" FOREIGN KEY ("elderId") REFERENCES "elders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "elderId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "duration" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "report" TEXT,
    CONSTRAINT "sessions_elderId_fkey" FOREIGN KEY ("elderId") REFERENCES "elders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "transcript_segments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "startTime" INTEGER NOT NULL,
    "endTime" INTEGER NOT NULL,
    "speaker" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "risk" TEXT,
    "keywords" JSONB,
    CONSTRAINT "transcript_segments_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "source_refs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "startChar" INTEGER NOT NULL,
    "endChar" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    CONSTRAINT "source_refs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "source_refs_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "transcript_segments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "session_dimensions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "risk" TEXT NOT NULL,
    "details" JSONB,
    "sourceSegmentIds" JSONB,
    CONSTRAINT "session_dimensions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "symptoms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "risk" TEXT NOT NULL,
    "sourceSegmentIds" JSONB,
    CONSTRAINT "symptoms_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "insight_blocks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "risk" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    CONSTRAINT "insight_blocks_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "insight_block_source_refs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "insightBlockId" TEXT NOT NULL,
    "sourceRefId" TEXT NOT NULL,
    CONSTRAINT "insight_block_source_refs_insightBlockId_fkey" FOREIGN KEY ("insightBlockId") REFERENCES "insight_blocks" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "insight_block_source_refs_sourceRefId_fkey" FOREIGN KEY ("sourceRefId") REFERENCES "source_refs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "warnings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "warnings_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "warning_source_refs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "warningId" TEXT NOT NULL,
    "sourceRefId" TEXT NOT NULL,
    CONSTRAINT "warning_source_refs_warningId_fkey" FOREIGN KEY ("warningId") REFERENCES "warnings" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "warning_source_refs_sourceRefId_fkey" FOREIGN KEY ("sourceRefId") REFERENCES "source_refs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "action_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "order" INTEGER NOT NULL,
    CONSTRAINT "action_items_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "action_item_source_refs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actionItemId" TEXT NOT NULL,
    "sourceRefId" TEXT NOT NULL,
    CONSTRAINT "action_item_source_refs_actionItemId_fkey" FOREIGN KEY ("actionItemId") REFERENCES "action_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "action_item_source_refs_sourceRefId_fkey" FOREIGN KEY ("sourceRefId") REFERENCES "source_refs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "body_findings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "viewSide" TEXT NOT NULL DEFAULT 'front',
    "bodyPart" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "risk" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "body_findings_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "body_finding_source_refs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bodyFindingId" TEXT NOT NULL,
    "sourceRefId" TEXT NOT NULL,
    CONSTRAINT "body_finding_source_refs_bodyFindingId_fkey" FOREIGN KEY ("bodyFindingId") REFERENCES "body_findings" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "body_finding_source_refs_sourceRefId_fkey" FOREIGN KEY ("sourceRefId") REFERENCES "source_refs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "appended_segment_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "appended_segment_logs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "elder_tags_elderId_tag_key" ON "elder_tags"("elderId", "tag");

-- CreateIndex
CREATE INDEX "sessions_elderId_date_idx" ON "sessions"("elderId", "date");

-- CreateIndex
CREATE INDEX "transcript_segments_sessionId_startTime_idx" ON "transcript_segments"("sessionId", "startTime");

-- CreateIndex
CREATE INDEX "source_refs_sessionId_idx" ON "source_refs"("sessionId");

-- CreateIndex
CREATE INDEX "source_refs_segmentId_idx" ON "source_refs"("segmentId");

-- CreateIndex
CREATE UNIQUE INDEX "session_dimensions_sessionId_dimension_key" ON "session_dimensions"("sessionId", "dimension");

-- CreateIndex
CREATE INDEX "symptoms_sessionId_idx" ON "symptoms"("sessionId");

-- CreateIndex
CREATE INDEX "insight_blocks_sessionId_idx" ON "insight_blocks"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "insight_block_source_refs_insightBlockId_sourceRefId_key" ON "insight_block_source_refs"("insightBlockId", "sourceRefId");

-- CreateIndex
CREATE INDEX "warnings_sessionId_order_idx" ON "warnings"("sessionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "warning_source_refs_warningId_sourceRefId_key" ON "warning_source_refs"("warningId", "sourceRefId");

-- CreateIndex
CREATE INDEX "action_items_sessionId_order_idx" ON "action_items"("sessionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "action_item_source_refs_actionItemId_sourceRefId_key" ON "action_item_source_refs"("actionItemId", "sourceRefId");

-- CreateIndex
CREATE INDEX "body_findings_sessionId_viewSide_bodyPart_idx" ON "body_findings"("sessionId", "viewSide", "bodyPart");

-- CreateIndex
CREATE UNIQUE INDEX "body_finding_source_refs_bodyFindingId_sourceRefId_key" ON "body_finding_source_refs"("bodyFindingId", "sourceRefId");

-- CreateIndex
CREATE INDEX "appended_segment_logs_sessionId_createdAt_idx" ON "appended_segment_logs"("sessionId", "createdAt");
