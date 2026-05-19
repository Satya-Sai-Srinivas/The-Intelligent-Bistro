import React, { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { View, Text, TouchableOpacity, ScrollView } from './styled';
import {
  SUPPORTED_LANGUAGES,
  useLanguageStore,
} from '../store/useLanguageStore';

export function LanguageSelector() {
  const { t } = useTranslation();
  const currentLanguage = useLanguageStore((s) => s.currentLanguage);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const [visible, setVisible] = useState(false);

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);

  const handleSelect = useCallback(
    (code: string) => {
      setLanguage(code);
      close();
    },
    [setLanguage, close]
  );

  return (
    <>
      <Pressable
        onPress={open}
        hitSlop={8}
        style={styles.trigger}
        accessibilityRole="button"
        accessibilityLabel={t('language.changeAccessibility')}
      >
        <Feather name="globe" size={20} color="#1A1A1A" />
        <Text className="text-sm font-semibold text-bistro-dark ml-1 uppercase">
          {currentLanguage}
        </Text>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View className="px-5 py-4 border-b border-gray-100 flex-row justify-between items-center">
              <Text className="text-lg font-bold text-bistro-dark">{t('language.title')}</Text>
              <TouchableOpacity onPress={close} hitSlop={12}>
                <Feather name="x" size={22} color="#1A1A1A" />
              </TouchableOpacity>
            </View>
            <ScrollView className="max-h-80">
              {SUPPORTED_LANGUAGES.map(({ code, label }) => {
                const selected = code === currentLanguage;
                return (
                  <TouchableOpacity
                    key={code}
                    onPress={() => handleSelect(code)}
                    className={`px-5 py-4 flex-row justify-between items-center border-b border-gray-50 ${
                      selected ? 'bg-bistro-gold/10' : ''
                    }`}
                  >
                    <Text className="text-base text-bistro-dark">{label}</Text>
                    {selected ? (
                      <Feather name="check" size={20} color="#C4A35A" />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '70%',
  },
});
