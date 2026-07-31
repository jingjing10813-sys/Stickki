import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type CheckState =
  | { status: 'loading' }
  | { status: 'ok'; groupCount: number; hasSession: boolean }
  | { status: 'error'; message: string };

export default function HomeScreen() {
  const [check, setCheck] = useState<CheckState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { count, error } = await supabase
          .from('groups')
          .select('id', { count: 'exact', head: true });
        if (error) throw error;
        const { data } = await supabase.auth.getSession();
        if (!cancelled) {
          setCheck({
            status: 'ok',
            groupCount: count ?? 0,
            hasSession: data.session !== null,
          });
        }
      } catch (e) {
        if (!cancelled) {
          setCheck({ status: 'error', message: e instanceof Error ? e.message : String(e) });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">스티끼 RN</ThemedText>
        <ThemedText type="small">Supabase 연결 스모크 테스트</ThemedText>

        {check.status === 'loading' && <ActivityIndicator style={styles.gap} />}
        {check.status === 'ok' && (
          <ThemedView style={styles.gap}>
            <ThemedText>✅ 백엔드 연결 성공</ThemedText>
            <ThemedText>방(groups) {check.groupCount}개 조회됨</ThemedText>
            <ThemedText>세션: {check.hasSession ? '로그인됨' : '없음 (정상 — 로그인 화면은 다음 단계)'}</ThemedText>
          </ThemedView>
        )}
        {check.status === 'error' && (
          <ThemedView style={styles.gap}>
            <ThemedText>❌ 연결 실패</ThemedText>
            <ThemedText type="small">{check.message}</ThemedText>
          </ThemedView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  gap: {
    marginTop: Spacing.four,
    alignItems: 'center',
    gap: Spacing.one,
  },
});
