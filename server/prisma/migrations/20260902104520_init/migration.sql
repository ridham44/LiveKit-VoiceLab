-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TerminationReason" AS ENUM ('USER_DISCONNECTED', 'MAX_DURATION_REACHED', 'SILENCE_TIMEOUT', 'IDLE_TIMEOUT', 'ERROR', 'MANUAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "TranscriptRole" AS ENUM ('USER', 'AGENT');

-- CreateEnum
CREATE TYPE "ToolCallStatus" AS ENUM ('SUCCESS', 'ERROR');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_configs" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sttProvider" TEXT NOT NULL,
    "llmProvider" TEXT NOT NULL,
    "ttsProvider" TEXT NOT NULL,
    "voiceSettings" JSONB NOT NULL,
    "transcriptionSettings" JSONB NOT NULL,
    "behaviorSettings" JSONB NOT NULL,
    "callSettings" JSONB NOT NULL,
    "backgroundAudio" JSONB NOT NULL,
    "tools" JSONB NOT NULL,

    CONSTRAINT "agent_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calls" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "configId" TEXT,
    "roomName" TEXT NOT NULL,
    "participantIdentity" TEXT,
    "status" "CallStatus" NOT NULL DEFAULT 'ACTIVE',
    "terminationReason" "TerminationReason",
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "sttProvider" TEXT NOT NULL,
    "llmProvider" TEXT NOT NULL,
    "ttsProvider" TEXT NOT NULL,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcript_entries" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "role" "TranscriptRole" NOT NULL,
    "text" TEXT NOT NULL,
    "isFinal" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT,
    "confidence" DOUBLE PRECISION,
    "timestampMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transcript_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_metrics" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "valueMs" DOUBLE PRECISION,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_call_logs" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "args" JSONB NOT NULL,
    "result" JSONB,
    "errorMessage" TEXT,
    "status" "ToolCallStatus" NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_documents" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_chunks" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "tokenCount" INTEGER NOT NULL,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_configs_agentId_isActive_idx" ON "agent_configs"("agentId", "isActive");

-- CreateIndex
CREATE INDEX "calls_agentId_startedAt_idx" ON "calls"("agentId", "startedAt");

-- CreateIndex
CREATE INDEX "transcript_entries_callId_timestampMs_idx" ON "transcript_entries"("callId", "timestampMs");

-- CreateIndex
CREATE INDEX "call_metrics_callId_kind_idx" ON "call_metrics"("callId", "kind");

-- CreateIndex
CREATE INDEX "tool_call_logs_callId_createdAt_idx" ON "tool_call_logs"("callId", "createdAt");

-- CreateIndex
CREATE INDEX "knowledge_documents_agentId_idx" ON "knowledge_documents"("agentId");

-- CreateIndex
CREATE INDEX "knowledge_chunks_documentId_idx" ON "knowledge_chunks"("documentId");

-- AddForeignKey
ALTER TABLE "agent_configs" ADD CONSTRAINT "agent_configs_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_configId_fkey" FOREIGN KEY ("configId") REFERENCES "agent_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript_entries" ADD CONSTRAINT "transcript_entries_callId_fkey" FOREIGN KEY ("callId") REFERENCES "calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_metrics" ADD CONSTRAINT "call_metrics_callId_fkey" FOREIGN KEY ("callId") REFERENCES "calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_call_logs" ADD CONSTRAINT "tool_call_logs_callId_fkey" FOREIGN KEY ("callId") REFERENCES "calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
