export interface Job {
  id: string;
  name: string;
  payload: any;
  attempts: number;
  maxAttempts: number;
  nextRunAt: number;
  errorLog: string[];
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
}

class QueueSystem {
  private queue: Job[] = [];
  private deadLetterQueue: Job[] = [];
  private isProcessing = false;
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    this.startWorkerLoop();
  }

  public addJob(params: { name: string; payload: any; maxAttempts?: number }) {
    const job: Job = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: params.name,
      payload: params.payload,
      attempts: 0,
      maxAttempts: params.maxAttempts || 3,
      nextRunAt: Date.now(),
      errorLog: [],
      status: 'PENDING',
    };

    this.queue.push(job);
    console.log(`[Queue System] Enqueued job: ${job.name} (ID: ${job.id})`);
    
    // Wake up worker loop if idle
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private startWorkerLoop() {
    this.timer = setInterval(() => {
      this.processQueue();
    }, 5000); // Check for scheduled retries every 5 seconds
  }

  public shutdown() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = Date.now();
      const runnableJobs = this.queue.filter(
        (job) => job.status === 'PENDING' && now >= job.nextRunAt
      );

      for (const job of runnableJobs) {
        job.status = 'RUNNING';
        job.attempts += 1;

        try {
          await this.executeJob(job);
          job.status = 'COMPLETED';
          // Remove from active queue on success
          this.queue = this.queue.filter((j) => j.id !== job.id);
          console.log(`[Queue System] Job completed successfully: ${job.name} (ID: ${job.id})`);
        } catch (error: any) {
          const errMsg = error.message || String(error);
          job.errorLog.push(`Attempt ${job.attempts} failed: ${errMsg}`);
          
          if (job.attempts >= job.maxAttempts) {
            job.status = 'FAILED';
            this.deadLetterQueue.push(job);
            this.queue = this.queue.filter((j) => j.id !== job.id);
            console.error(`[Queue System] Job failed permanently and moved to DLQ: ${job.name} (ID: ${job.id}). Errors:`, job.errorLog);
          } else {
            job.status = 'PENDING';
            // Exponential backoff: 2s, 4s, 8s...
            const backoffMs = Math.pow(2, job.attempts) * 1000;
            job.nextRunAt = Date.now() + backoffMs;
            console.warn(`[Queue System] Job failed. Retrying in ${backoffMs / 1000}s. Job: ${job.name} (ID: ${job.id})`);
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeJob(job: Job): Promise<void> {
    // Dispatch jobs to corresponding workers
    switch (job.name) {
      case 'send-sms':
        await this.handleSendSMS(job.payload);
        break;
      case 'send-email':
        await this.handleSendEmail(job.payload);
        break;
      case 'generate-invoice':
        await this.handleGenerateInvoice(job.payload);
        break;
      case 'reconcile-payment':
        await this.handleReconcilePayment(job.payload);
        break;
      default:
        throw new Error(`Unknown job worker name: ${job.name}`);
    }
  }

  // Individual Job Handler Mocks
  private async handleSendSMS(payload: { phone: string; message: string }): Promise<void> {
    console.log(`[SMS Worker] Dispatching SMS to ${payload.phone}: "${payload.message}"`);
    // Simulate slight network delay
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  private async handleSendEmail(payload: { userId: string; title: string; body: string }): Promise<void> {
    console.log(`[Email Worker] Dispatching Email to user ${payload.userId}: "${payload.title}"`);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  private async handleGenerateInvoice(payload: { bookingId: string }): Promise<void> {
    console.log(`[Invoice Worker] Rendering PDF invoice on server for Booking ${payload.bookingId}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  private async handleReconcilePayment(payload: { paymentId: string }): Promise<void> {
    console.log(`[Reconciliation Worker] Verifying ledger sync for Payment ${payload.paymentId}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Admin accessors
  public getDLQ(): Job[] {
    return this.deadLetterQueue;
  }

  public getQueueStats() {
    return {
      activeJobsCount: this.queue.length,
      dlqJobsCount: this.deadLetterQueue.length,
      jobs: this.queue.map(j => ({ id: j.id, name: j.name, status: j.status, attempts: j.attempts })),
    };
  }

  public clearDLQ() {
    this.deadLetterQueue = [];
  }
}

export const queueSystem = new QueueSystem();
