# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# DB Payload Design Guideline

- Every dropdown value stored in the DB as payload (e.g. transformers, conductors, poles) must go as the numeric `id` value, not by name or label.
- Every domain dropdown value stored in the DB (e.g. earthing, stay_set, pole_db) must go as the `domain_code` string/number code, not by name or label.
