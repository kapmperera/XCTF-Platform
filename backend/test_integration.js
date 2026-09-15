const API_URL = "http://localhost:5001/api";

async function runIntegrationTests() {
  console.log("🧪 Running End-to-End XCTF Integration Test Suite...\n");

  try {
    // Test 1: Fetch platform info
    console.log("1️⃣ Fetching Platform Info...");
    const infoRes = await fetch(`${API_URL}/info`);
    const infoData = await infoRes.json();
    console.log(`   ✅ Status: ${infoData.status}, Title: "${infoData.title}", Challenges: ${infoData.metrics.challenges_count}`);

    // Test 2: Register new user
    console.log("\n2️⃣ Registering new operative user 'ghost_operative'...");
    const testUsername = "ghost_" + Math.floor(Math.random() * 10000);
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: testUsername,
        email: `${testUsername}@xctf.io`,
        password: "Password123!"
      })
    });
    const regData = await regRes.json();
    const userToken = regData.token;
    console.log(`   ✅ Registration successful! User ID: ${regData.user.id}, Token issued.`);

    const userAuthHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userToken}`
    };

    // Test 3: Fetch challenge list
    console.log("\n3️⃣ Fetching Challenge List...");
    const chListRes = await fetch(`${API_URL}/challenges`, { headers: userAuthHeaders });
    const chListData = await chListRes.json();
    console.log(`   ✅ Retrieved ${chListData.challenges.length} active challenges.`);
    const firstChallenge = chListData.challenges.find(c => c.slug === "client-side-is-not-good") || chListData.challenges[0];
    console.log(`   📍 Selected Target: ID ${firstChallenge.id} - "${firstChallenge.title}" (${firstChallenge.points} PTS)`);

    // Test 4: Submit WRONG flag
    console.log("\n4️⃣ Submitting WRONG flag...");
    const wrongRes = await fetch(`${API_URL}/challenges/${firstChallenge.id}/submit`, {
      method: "POST",
      headers: userAuthHeaders,
      body: JSON.stringify({ flag: "XCTF{totally_wrong_flag_payload}" })
    });
    const wrongData = await wrongRes.json();
    console.log(`   ✅ Wrong flag rejected as expected: is_correct=${wrongData.is_correct}, message="${wrongData.message}"`);

    // Test 5: Submit CORRECT flag
    console.log("\n5️⃣ Submitting CORRECT flag for 'Client Side is not good...'...");
    const correctRes = await fetch(`${API_URL}/challenges/${firstChallenge.id}/submit`, {
      method: "POST",
      headers: userAuthHeaders,
      body: JSON.stringify({ flag: "XCTF{client_side_is_bad_0101001}" })
    });
    const correctData = await correctRes.json();
    console.log(`   ✅ Flag Accepted! points_awarded=${correctData.points_awarded}, new_score=${correctData.new_score}`);

    // Test 6: Verify duplicate submission prevention
    console.log("\n6️⃣ Attempting DUPLICATE flag submission...");
    const dupRes = await fetch(`${API_URL}/challenges/${firstChallenge.id}/submit`, {
      method: "POST",
      headers: userAuthHeaders,
      body: JSON.stringify({ flag: "XCTF{client_side_is_bad_0101001}" })
    });
    const dupData = await dupRes.json();
    console.log(`   ✅ Duplicate submission prevented: ${dupData.message}`);

    // Test 7: Verify Leaderboard Ranking
    console.log("\n7️⃣ Verifying Leaderboard Rankings...");
    const lbRes = await fetch(`${API_URL}/leaderboard`);
    const lbData = await lbRes.json();
    const foundInLb = lbData.leaderboard.find(u => u.username === testUsername);
    if (foundInLb) {
      console.log(`   ✅ Operative '${testUsername}' is ranked #${foundInLb.rank} on the Leaderboard with ${foundInLb.score} PTS!`);
    } else {
      console.log(`   ⚠️ User not found in top leaderboard.`);
    }

    // Test 8: Admin Login & Operations
    console.log("\n8️⃣ Testing Admin Login & Privileged Operations...");
    const adminLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@xctf.io",
        password: "Admin@123456"
      })
    });
    const adminData = await adminLoginRes.json();
    const adminToken = adminData.token;
    const adminHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${adminToken}`
    };

    const adminStatsRes = await fetch(`${API_URL}/admin/overview`, { headers: adminHeaders });
    const adminStatsData = await adminStatsRes.json();
    console.log(`   ✅ Admin Metrics: ${adminStatsData.metrics.total_users} Users, ${adminStatsData.metrics.total_submissions} Total Submissions logged.`);

    // Ensure an Active Mini CTF exists for testing
    const adminMiniCheckRes = await fetch(`${API_URL}/admin/mini-ctfs`, { headers: adminHeaders });
    const adminMiniCheckData = await adminMiniCheckRes.json();
    let activeMini = (adminMiniCheckData.mini_ctfs || []).find(m => m.status === "Active" && m.challenges_count > 0);
    if (!activeMini) {
      const createMiniRes = await fetch(`${API_URL}/admin/mini-ctfs`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          title: `Integration Speedrun ${Date.now()}`,
          description: "Automated test speedrun Mini CTF",
          difficulty: "Medium",
          category: "Web Exploitation",
          status: "Active",
          visibility: "Public",
          time_mode: "normal",
          time_limit_minutes: 30,
          challenge_ids: [firstChallenge.id]
        })
      });
      const createMiniData = await createMiniRes.json();
      activeMini = { id: createMiniData.mini_ctf_id, title: "Integration Speedrun", challenges_count: 1 };
    }

    // Test 9: Mini CTF System, Step Skip, & Final Results
    console.log("\n9️⃣ Testing Mini CTF Listing, Step Skip & Final Results Breakdown...");
    const miniListRes = await fetch(`${API_URL}/mini-ctfs`, { headers: userAuthHeaders });
    const miniListData = await miniListRes.json();
    console.log(`   ✅ Retrieved ${miniListData.mini_ctfs.length} visible Mini CTFs.`);

    const targetMiniCtf = miniListData.mini_ctfs.find(m => m.id === activeMini.id) || miniListData.mini_ctfs[0];
    console.log(`   🎯 Selected Speedrun Target: "${targetMiniCtf.title}" (${targetMiniCtf.challenges_count} Challenges)`);

    // Start Mini CTF timer on user action
    const startRes = await fetch(`${API_URL}/mini-ctfs/${targetMiniCtf.id}/start`, {
      method: "POST",
      headers: userAuthHeaders
    });
    const startData = await startRes.json();
    console.log(`   ✅ Speedrun timer initialized! Attempt ID: ${startData.attempt.id}, Start Time: ${startData.attempt.start_time}`);

    // Fetch detail & challenge sequence
    const detailRes = await fetch(`${API_URL}/mini-ctfs/${targetMiniCtf.id}`, { headers: userAuthHeaders });
    const detailData = await detailRes.json();
    const chSequence = detailData.challenges;
    console.log(`   📍 Challenge Sequence: ${chSequence.map(c => c.title).join(" -> ")}`);

    const allChRes = await fetch(`${API_URL}/admin/challenges`, { headers: adminHeaders });
    const allChData = await allChRes.json();
    const flagMap = {};
    allChData.challenges.forEach(c => { flagMap[c.id] = c.flag; });

    // Test skipping step for second challenge if sequence >= 2
    if (chSequence.length >= 2) {
      const skipRes = await fetch(`${API_URL}/mini-ctfs/${targetMiniCtf.id}/step`, {
        method: "POST",
        headers: userAuthHeaders,
        body: JSON.stringify({ challenge_id: chSequence[1].id, action: "skip" })
      });
      const skipData = await skipRes.json();
      console.log(`   ✅ Step skip recorded for '${chSequence[1].title}': action=${skipData.action}`);
    }

    // Submit flags for all challenges in sequence to complete Mini CTF
    for (let i = 0; i < chSequence.length; i++) {
      const ch = chSequence[i];
      const correctFlag = flagMap[ch.id];
      const subRes = await fetch(`${API_URL}/mini-ctfs/${targetMiniCtf.id}/submit-flag`, {
        method: "POST",
        headers: userAuthHeaders,
        body: JSON.stringify({ challenge_id: ch.id, flag: correctFlag })
      });
      const subData = await subRes.json();
      console.log(`      Submit Step ${i + 1}/${chSequence.length} ("${ch.title}") -> Correct: ${subData.is_correct}, Completed: ${subData.mini_ctf_completed}, Time: ${subData.formatted_time || 'N/A'}`);
    }

    // Fetch Final Results breakdown payload
    const resultsRes = await fetch(`${API_URL}/mini-ctfs/${targetMiniCtf.id}/results`, { headers: userAuthHeaders });
    const resultsData = await resultsRes.json();
    console.log(`   🏆 Final Results Payload: Total Time=${resultsData.attempt.formatted_total_time}, Completed=${resultsData.metrics.completed_count}/${resultsData.metrics.total_challenges}, Rate=${resultsData.metrics.completion_rate}%`);
    console.log(`   📍 Message: "${resultsData.metrics.congratulations_message}"`);

    // Verify Speedrun Leaderboard
    const mktfLbRes = await fetch(`${API_URL}/mini-ctfs/${targetMiniCtf.id}/leaderboard`);
    const mktfLbData = await mktfLbRes.json();
    console.log(`   🏆 Speedrun Leaderboard count: ${mktfLbData.leaderboard.length} entry/entries recorded.`);

    // Test 10: Admin Status Lifecycle Rules Validation
    console.log("\n🔟 Testing Admin Status Transition Lifecycle Rules...");
    const adminMiniListRes = await fetch(`${API_URL}/admin/mini-ctfs`, { headers: adminHeaders });
    const adminMiniListData = await adminMiniListRes.json();
    const adminTarget = adminMiniListData.mini_ctfs[0];

    // Invalid transition test (e.g. Active -> Draft or Draft -> Completed)
    const invalidTransRes = await fetch(`${API_URL}/admin/mini-ctfs/${adminTarget.id}/status`, {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({ status: "Draft", reason: "Invalid leap test" })
    });

    if (adminTarget.status === "Active") {
      const invalidData = await invalidTransRes.json();
      console.log(`   ✅ Invalid lifecycle transition blocked as expected: "${invalidData.error}"`);
    }

    // Valid transition test (Active -> Published or Active -> Completed)
    const validTransRes = await fetch(`${API_URL}/admin/mini-ctfs/${adminTarget.id}/status`, {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({ status: "Completed", reason: "Integration test completed" })
    });
    const validData = await validTransRes.json();
    console.log(`   ✅ Valid status transition executed: ${validData.message}`);

    // Test 11: Admin Challenge Reset to Review & Re-Activation
    console.log("\n1️⃣1️⃣ Testing Admin Challenge Reset to Review & Re-activation...");
    const testChId = firstChallenge.id;
    const resetChRes = await fetch(`${API_URL}/admin/challenges/${testChId}/reset-review`, {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({ reason: "Auditing challenge parameters and hint quality" })
    });
    const resetChData = await resetChRes.json();
    console.log(`   ✅ Challenge reset to review: is_active=${resetChData.is_active}, message="${resetChData.message}"`);

    // Verify user challenge list no longer includes suspended challenge
    const userChRes = await fetch(`${API_URL}/challenges`, { headers: userAuthHeaders });
    const userChData = await userChRes.json();
    const isSuspendedFound = userChData.challenges.some(c => c.id === testChId);
    console.log(`   ✅ Suspended challenge excluded from active user catalog: hidden=${!isSuspendedFound}`);

    // Re-activate challenge
    const activateChRes = await fetch(`${API_URL}/admin/challenges/${testChId}/activate`, {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({ reason: "Audit passed, restored to active catalog" })
    });
    const activateChData = await activateChRes.json();
    console.log(`   ✅ Challenge re-activated: is_active=${activateChData.is_active}`);

    // Test 12: Admin Mini CTF Reset to Review
    console.log("\n1️⃣2️⃣ Testing Admin Mini CTF Reset to Review...");
    const resetCtfRes = await fetch(`${API_URL}/admin/mini-ctfs/${targetMiniCtf.id}/reset-review`, {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({ reason: "Re-evaluating challenge ordering and timer rules" })
    });
    const resetCtfData = await resetCtfRes.json();
    console.log(`   ✅ Mini CTF reset to review: status=${resetCtfData.status}`);

    // Test 13: Participant Progress Reset & Score Adjustment
    console.log("\n1️⃣3️⃣ Testing Participant Progress Reset & Score Adjustment...");
    const resetProgRes = await fetch(`${API_URL}/admin/reset/participant-progress`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        scope: "single_user_challenge",
        challenge_id: testChId,
        user_id: regData.user.id,
        reason: "Resetting operative solve for regression verification"
      })
    });
    const resetProgData = await resetProgRes.json();
    console.log(`   ✅ Participant progress reset completed: affected=${resetProgData.affected_count}, message="${resetProgData.message}"`);

    // Test 14: Fetching Admin Reset Audit Logs
    console.log("\n1️⃣4️⃣ Fetching Admin Reset Audit Logs...");
    const logsRes = await fetch(`${API_URL}/admin/reset-logs`, { headers: adminHeaders });
    const logsData = await logsRes.json();
    const resetLogs = logsData.reset_logs || [];
    console.log(`   ✅ Retrieved ${resetLogs.length} audit log entries from database.`);
    if (resetLogs.length > 0) {
      const latestLog = resetLogs[0];
      console.log(`   📍 Latest Log Entry: type="${latestLog.reset_type}", target="${latestLog.target_type}#${latestLog.target_id}", reason="${latestLog.reason}"`);
    }

    // Test 15: Admin Challenge Status Reversal ("Revert to Inspect")
    console.log("\n1️⃣5️⃣ Testing Admin Challenge Status Reversal ('Revert to Inspect')...");
    const revertRes = await fetch(`${API_URL}/admin/challenges/${testChId}/revert-to-inspect`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        user_id: regData.user.id,
        reason: "Reverting challenge status from Review Mission (Completed) back to Inspect Challenge (Incomplete) for inspection."
      })
    });
    const revertData = await revertRes.json();
    console.log(`   ✅ Status Reversal executed: prev="${revertData.previous_status}", new="${revertData.new_status}", message="${revertData.message}"`);

    // Verify user challenge endpoint shows solved = false (Inspect Challenge state)
    const checkChRes = await fetch(`${API_URL}/challenges/${testChId}`, { headers: userAuthHeaders });
    const checkChData = await checkChRes.json();
    console.log(`   ✅ Challenge user state updated: solved=${checkChData.challenge.solved} (Ready for Inspect Challenge)`);

    // Verify audit log entry
    const finalLogsRes = await fetch(`${API_URL}/admin/reset-logs`, { headers: adminHeaders });
    const finalLogsData = await finalLogsRes.json();
    const latestRevertLog = (finalLogsData.reset_logs || []).find(l => l.reset_type === "Status_Reversal_Revert_To_Inspect");
    if (latestRevertLog) {
      console.log(`   ✅ Audit Log verified: type="${latestRevertLog.reset_type}", reason="${latestRevertLog.reason}"`);
    }

    // Test 16: Admin Time Mode Configuration & Server-side Time Expiration Enforcement
    console.log("\n1️⃣6️⃣ Testing Admin Time Mode Configuration & Server-side Time Expiration...");
    const timeLimitedRes = await fetch(`${API_URL}/admin/mini-ctfs`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        title: `Time Limited Operation ${Date.now()}`,
        description: "Testing server-side countdown and expiration logic",
        difficulty: "Hard",
        category: "Speedrun",
        status: "Active",
        visibility: "Public",
        time_mode: "time_limited",
        time_limit_minutes: 15,
        challenge_ids: [firstChallenge.id]
      })
    });
    const timeLimitedData = await timeLimitedRes.json();
    const createdTimeLimitedId = timeLimitedData.mini_ctf_id;
    console.log(`   ✅ Created Time-Limited Mini CTF (ID ${createdTimeLimitedId})`);

    // Start explicit attempt
    const startTlRes = await fetch(`${API_URL}/mini-ctfs/${createdTimeLimitedId}/start`, {
      method: "POST",
      headers: userAuthHeaders
    });
    const startTlData = await startTlRes.json();
    console.log(`   ✅ Explicit Start Mini CTF action logged: attempt_id=${startTlData.attempt.id}, status=${startTlData.attempt.status}`);

    // Verify detail endpoint returns remaining_seconds & time_mode
    const tlDetailRes = await fetch(`${API_URL}/mini-ctfs/${createdTimeLimitedId}`, { headers: userAuthHeaders });
    const tlDetailData = await tlDetailRes.json();
    console.log(`   ✅ Verified server countdown: mode=${tlDetailData.time_mode}, limit=${tlDetailData.time_limit_minutes}m, remaining=${tlDetailData.remaining_seconds}s, is_expired=${tlDetailData.is_expired}`);

    // Submit flag in Time-Limited Mode to verify flag submission is accepted without false timezone expiration
    const tlSubRes = await fetch(`${API_URL}/mini-ctfs/${createdTimeLimitedId}/submit-flag`, {
      method: "POST",
      headers: userAuthHeaders,
      body: JSON.stringify({
        challenge_id: firstChallenge.id,
        flag: firstChallenge.flag
      })
    });
    const tlSubData = await tlSubRes.json();
    console.log(`   ✅ Submitted flag in Time-Limited Mode: is_correct=${tlSubData.is_correct}, mini_ctf_completed=${tlSubData.mini_ctf_completed} (No false timezone expiration!)`);

    // Test editing Mini CTF from Time-Limited to Normal Mode and vice versa
    const editNormalRes = await fetch(`${API_URL}/admin/mini-ctfs/${createdTimeLimitedId}`, {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({
        time_mode: "normal"
      })
    });
    const editNormalDetailRes = await fetch(`${API_URL}/mini-ctfs/${createdTimeLimitedId}`, { headers: userAuthHeaders });
    const editNormalDetailData = await editNormalDetailRes.json();
    console.log(`   ✅ Admin edited Mini CTF from Time-Limited to Normal Mode: new_mode=${editNormalDetailData.time_mode}, remaining_seconds=${editNormalDetailData.remaining_seconds}`);

    // Edit back to Time-Limited Mode
    await fetch(`${API_URL}/admin/mini-ctfs/${createdTimeLimitedId}`, {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({
        time_mode: "time_limited",
        time_limit_minutes: 20
      })
    });
    const editTlDetailRes = await fetch(`${API_URL}/mini-ctfs/${createdTimeLimitedId}`, { headers: userAuthHeaders });
    const editTlDetailData = await editTlDetailRes.json();
    console.log(`   ✅ Admin edited Mini CTF back to Time-Limited Mode: new_mode=${editTlDetailData.time_mode}, limit=${editTlDetailData.time_limit_minutes}m`);

    // Test 17: Admin Reset Mini CTF Attempts ("Reset CTF") & Challenge/Timer Reset Options for Dual Time Modes
    console.log("\n1️⃣7️⃣ Testing Admin Reset Mini CTF Attempts ('Reset CTF') & Timer Resets for Dual Time Modes...");

    // Test 17A: Resetting Time-Limited Mode Mini CTF
    const resetTlId = createdTimeLimitedId;
    const resetTlRes = await fetch(`${API_URL}/admin/mini-ctfs/${resetTlId}/reset-attempts`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        reason: "Testing Admin Reset CTF on Time-Limited Mode",
        target_status: "Published",
        challenge_reset_option: "all"
      })
    });
    const resetTlData = await resetTlRes.json();
    console.log(`   ✅ [Time-Limited Mode] Admin Reset CTF executed: option="${resetTlData.challenge_reset_option}", affected_attempts=${resetTlData.affected_attempts_count}`);

    // Verify time-limited detail endpoint resets remaining_seconds to 900 (15m full limit) and user_attempt = null
    const tlFreshRes = await fetch(`${API_URL}/mini-ctfs/${resetTlId}`, { headers: userAuthHeaders });
    const tlFreshData = await tlFreshRes.json();
    console.log(`   ✅ [Time-Limited Mode] Detail state post-reset: remaining_seconds=${tlFreshData.remaining_seconds}s (Full 15m limit), is_expired=${tlFreshData.is_expired}, user_attempt=${tlFreshData.user_attempt === null ? 'null (Cleared session)' : 'found'}`);

    // Start fresh Attempt #2 on Time-Limited Mini CTF
    const startTlAtt2Res = await fetch(`${API_URL}/mini-ctfs/${resetTlId}/start`, {
      method: "POST",
      headers: userAuthHeaders
    });
    const startTlAtt2Data = await startTlAtt2Res.json();
    console.log(`   ✅ [Time-Limited Mode] Started Attempt #2: attempt_id=${startTlAtt2Data.attempt.id}, attempt_number=${startTlAtt2Data.attempt.attempt_number}, status=${startTlAtt2Data.attempt.status}`);

    // Test 17B: Resetting Normal Mode Mini CTF
    const resetNormalId = targetMiniCtf.id;
    const resetNormalRes = await fetch(`${API_URL}/admin/mini-ctfs/${resetNormalId}/reset-attempts`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        reason: "Testing Admin Reset CTF on Normal Mode",
        target_status: "Published",
        challenge_reset_option: "all"
      })
    });
    const resetNormalData = await resetNormalRes.json();
    console.log(`   ✅ [Normal Mode] Admin Reset CTF executed: option="${resetNormalData.challenge_reset_option}", affected_attempts=${resetNormalData.affected_attempts_count}`);

    // Verify normal mode detail endpoint resets elapsed_seconds to 0 and user_attempt = null
    const normalFreshRes = await fetch(`${API_URL}/mini-ctfs/${resetNormalId}`, { headers: userAuthHeaders });
    const normalFreshData = await normalFreshRes.json();
    console.log(`   ✅ [Normal Mode] Detail state post-reset: elapsed_seconds=${normalFreshData.elapsed_seconds}s (Reset to 00:00), user_attempt=${normalFreshData.user_attempt === null ? 'null (Cleared session)' : 'found'}`);

    // Start fresh Attempt #2 on Normal Mode Mini CTF
    const startNormalAtt2Res = await fetch(`${API_URL}/mini-ctfs/${resetNormalId}/start`, {
      method: "POST",
      headers: userAuthHeaders
    });
    const startNormalAtt2Data = await startNormalAtt2Res.json();
    console.log(`   ✅ [Normal Mode] Started Attempt #2: attempt_id=${startNormalAtt2Data.attempt.id}, attempt_number=${startNormalAtt2Data.attempt.attempt_number}, status=${startNormalAtt2Data.attempt.status}`);

    // Verify audit log entry logged in admin_reset_logs
    const resetAuditRes = await fetch(`${API_URL}/admin/reset-logs`, { headers: adminHeaders });
    const resetAuditData = await resetAuditRes.json();
    const latestAttemptResetLog = (resetAuditData.reset_logs || []).find(l => l.reset_type === "Mini_CTF_Attempt_Reset");
    if (latestAttemptResetLog) {
      console.log(`   ✅ Audit Log verified: type="${latestAttemptResetLog.reset_type}", target="${latestAttemptResetLog.target_type}#${latestAttemptResetLog.target_id}", reason="${latestAttemptResetLog.reason}"`);
    }

    // Cleanup phase: Delete temporary Mini CTFs created during integration test run
    console.log("\n🧹 Cleaning up temporary test Mini CTFs...");
    if (activeMini && activeMini.id) {
      await fetch(`${API_URL}/admin/mini-ctfs/${activeMini.id}`, { method: "DELETE", headers: adminHeaders });
    }
    if (createdTimeLimitedId) {
      await fetch(`${API_URL}/admin/mini-ctfs/${createdTimeLimitedId}`, { method: "DELETE", headers: adminHeaders });
    }
    console.log("   ✅ Temporary test Mini CTF records purged from database.");

    console.log("\n==================================================");
    console.log("🎉 ALL E2E INTEGRATION TESTS PASSED 100% CLEANLY!");
    console.log("==================================================\n");
  } catch (err) {
    console.error("❌ Integration Test Failed:", err.message);
    process.exit(1);
  }
}

runIntegrationTests();



