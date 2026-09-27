import { ref } from 'vue';
import { practiqApi } from '@/api/request/server';
import { AttemptReviewService } from '@/services/attemptReviews/attemptReviewService';

const count = ref(0);
const hasMore = ref(false);
const service = new AttemptReviewService(practiqApi);
let inflight: Promise<void> | null = null;

async function load(): Promise<void> {
    if (!inflight) {
        inflight = (async () => {
            try {
                const page = await service.list({ reviewed: 'unreviewed', limit: 100 });
                count.value = page.data.length;
                hasMore.value = page.has_more;
            } catch {
                count.value = 0;
                hasMore.value = false;
            } finally {
                inflight = null;
            }
        })();
    }
    return inflight;
}

export function usePendingReviews() {
    return { count, hasMore, load };
}
