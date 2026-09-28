# Corrections and evaluation

A saved correction changes coaching context immediately. It doesn't train the model. Original detections and accepted correction revisions remain separate in the user's private records.

Before an evaluation export exists, define a small rubric: food identification, missed and false items, useful quantity ranges, uncertainty quality, unsafe advice, and fit to student kitchen constraints. Review a representative set manually. Don't use a guessed photo weight as ground truth. Record the provider, model identifier, prompt version, source image conditions, and accepted correction revision.

Any future export must require current explicit evaluation consent, remove identifiers and private free text, exclude deleted scans, track revocation, and undergo a privacy review. Consent for evaluation is not consent for training. Obtain separate, specific permission before any training upload. Don't claim anonymization from merely removing an account ID or reuse private images by default.

Compare prompt changes on a held-out evaluation set before considering fine-tuning. Only consider fine-tuning when enough reviewed examples exist to show a repeatable error that simpler prompt or workflow changes haven't fixed. Keep evaluation and training partitions separate, and measure regressions in uncertainty and safety as well as accuracy.

No export, fine-tuning, or live training job ships in this release.
