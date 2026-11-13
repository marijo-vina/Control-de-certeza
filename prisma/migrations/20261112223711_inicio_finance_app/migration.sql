-- CreateTable
CREATE TABLE "settings" (
    "user_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("user_id","key")
);

-- CreateTable
CREATE TABLE "apartados" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "current" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "target" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "category" TEXT,
    "type" TEXT NOT NULL DEFAULT 'objetivo',
    "period" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "apartados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compromisos" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "due_day" INTEGER NOT NULL DEFAULT 1,
    "current_month" INTEGER NOT NULL DEFAULT 1,
    "total_months" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compromisos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingresos_variables" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "certainty" TEXT NOT NULL DEFAULT 'posible',
    "date" TEXT,
    "is_recurring" BOOLEAN DEFAULT false,
    "period" TEXT DEFAULT 'unico',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingresos_variables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "concept" TEXT,
    "date" TEXT,
    "origin" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "apartados_user_id_idx" ON "apartados"("user_id");

-- CreateIndex
CREATE INDEX "compromisos_user_id_idx" ON "compromisos"("user_id");

-- CreateIndex
CREATE INDEX "ingresos_variables_user_id_idx" ON "ingresos_variables"("user_id");

-- CreateIndex
CREATE INDEX "transactions_user_id_idx" ON "transactions"("user_id");
