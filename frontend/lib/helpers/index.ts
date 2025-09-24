export function sentenceCase(str: string): string {
	return str?.length ? str[0].toLocaleUpperCase() + str.slice(1) : str;
}
