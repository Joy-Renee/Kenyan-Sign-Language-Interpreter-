Eval: 30 fixed sign sequences, model muse-spark-1.3, one run, effort minimal.

| Metric | Rule-based baseline | Muse Spark (via same code as proxy) |
|---|---|---|
| Valid JSON, first try | n/a (no model) | 53% (16/30) |
| Valid JSON, after 1 retry | n/a | 67% (20/30) |
| Intent accuracy | 100% (30/30) | 63% (19/30) (model answers only) |
| Intent accuracy, end to end with fallback | 100% (30/30) | 97% (29/30) |
| Asked a question on 7 unclear sequences | 100% (7/7) | 71% (5/7) |
| Latency per utterance (mean / median / p95) | <1 ms | 4654 / 3989 / 7786 ms |
| Tokens per utterance (input / output / total, incl. retries) | 0 | 661 / 408 / 1070 |

Caveats: gold labels and the baseline were written by the same author (an AI assistant), so the baseline is tuned to this set and its accuracy is not evidence it generalises. One run; model output varies. Sign sequences are idealised, not recognizer output.
