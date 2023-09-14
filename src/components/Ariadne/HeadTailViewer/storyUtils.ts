import { ValidatedSequence } from "@Ariadne/types";
import { getAnnotatedSequence } from "@Ariadne/utils";

const sequence1 =
  "GTTGCGCAGCTCCTGGATGTAGGCCAGCCAGTCCTGATTGGAGATGCCGTTCTGCAGCTTCAGATCCTTGCTCTCCTTCAGGTGATTCAGCAGCAGCTGGCCCTTCAGGGCGATGTGGTAGGCGCCATTGGCATCGGCGTCCATGGGCCACTCTGGGTTCTGAAACCGGGAGTCGAAGCACACGCCATTCAGATCGCGCACGGGGCTGTTGATATAGTCCTCGCCTGTGGCGGCATTGGAGTTCCGCATCTGCAGCACGCTGCGGATCAGGGCCACCATGGTGTCGATGGCGTGAGAATCGTCATTCTCCAGCAGCTTTGGCAGGATGTTGGAGCCATCCCTGAACACGATGCCCTTCTCCTCCAGCAGGGCGATCAGCTCGTTGGCAGGATACAGGTCCCGGTATCTGCCGGTGAATCTGTGATTCTCGATCACTGGCACGATTCTCTTGCCGGCGATGAAAGGGGTGCCCTTGGCGTCAAACTGTGTCTCGTTCTTCTCGAACACGATATCCCATGCAGGCATAAAGCCGGGCAGGCCCCTCTGGAAGGACAGATTTCTGTTCATCTTAAAGTGCAGGATGAAGTCGCCGGTTTTCACGTCGTAGTGCAGAAAGTCGAAGCCCTCCAGGAAGTGCTTGCGGCTCTCGTGATTCTTGATGGTTTTCCACACGAAGGGGTCCACGAAGCCGGTCAGGGGATCGATCTTAGATGTATATGGGGCAGGCACGTAAAACAGGAAGCCAGACTGGGTGCCCATCTTGGCAAAGGAGGTGAACTGGTCTGTCAGCTGGTATGGGTTCAGCACGCCTCCCACTTTCTCTGCTGGATAGTCCTTCAGCACCAGGCAATTCAGCTTATCGATCAGCATCTTCTCGAACTGCTGGTACACGGCCTTCTCGGCGATGCCGGTCCTCTTGCTCTTAAAGCCGAAATTCAGGTTCTCCAGCACCACCACGGCCTGGTAGTGGATCATCAGGTCCACGATCTCGTGGATGACCTGGCTCAGATAGCCCTGCTTCAGATCCTTGATTGTGCCCACCACAGACCAGGCCTGCCTTGCTGCCACCCTCTCCTTCTCCCTGTTGTCCAGCTTCTTCTGGTAATCAAACTGCTGGATGGTGTTCAGGCTCCGCTGCTCCAGGATCTTGCCGGTGGAGTCGATCACTGTGATATAGATCAGGTTTCTCTCGCCCCGATCGATGCCGATGATAGGTGTCTCGGGGTGCTCCTTCAGGTAGGCATTCACCCTCTGGTTGAACTTAGATGGGGAATTGGCGGCCTGATAGTTCAGTGTGATAGGCACGTGGAAAAAGAACTTGTCGCTGGTAAAGCGCCTATCCTTGATGATCTCGTGAGACACCTCCTTGGTGATCACGTTGGGCAGCAGGGCCCTGGCCTCATCAGACAGGTCGTGGGACAGTCTGTGATTCACATAGTCGTACAGCTCCTGGTACAGGGTGTCGGGGATTGGGGTTTTCTGATCCTTCAGCTTCTTGTTCAGCATCTTCTCTCCCAGCCGGTGTGCCATCCTCTTCATCCTGGACTTAGGGCGGTAGAACAGCTCGGCCTGGCCATTCAGCTTGATGCTTGTCTTGGCCAGGTTCTCTGGAGAAAACAGGCCGGTCCAATACAGTGTGTGCAGATTAGGCTTGCCGTGGTGGCCCTTGGCAAAGTCCTTGTTATAGATCTGGAACAGGTACAGCTTGCCTGTCTCCACGGCATCCATGATCTCCTTCTCGGCGATTCTCTGGAAGCTGATGTGGTACAGCAGGGGATTCAGCTCGGCATAGTACTCGCCCAGGTCCTTATACTGAGAGGATGGCCGCAGGCTAGACAGATCGATAGAGGTTGTCTTGGTATACTTGGACAGAAAATCCCTTGTGAAGTCGATCCACTTGCACAGGGCCTCTCTGTAGCCCTTCTGGTCGCCGGTTTTCTTGGCGTAGGCTGTCTGAAACTTCTTTGGCTCCTTCTCAGGATTGTTCAGGTCGTAGATCTCCTTTGTGATCTCCAGAGGCTCGATGAAATTGTTGGACAGCAGGATGGGGGTTGTGTGGGTCTGAAAGTGGGCTGTCACGGCCTTCAGCTGGGTGCTGCACTTTGGGATCATCTTGGCGGCATCAGGGAAGTAGTCATAGTACATCTTATCAAAGCCCTCGCTGGTTTTCTCTGTGGGCTCGAAGCTCAGGGCCTTATACCTGCCCTTCTGCTTTGGCATGATGCCCAGATAGTACAGGCCGTTCTTCACAAACAGGATGGCGCCATTGTTCTTCTCCTTATTCACGTCCCAGCCAGAGGCCAGTGTAGGCATCTGAAAGTTCAGCTTGAACTTCTCCACGGAGTAGGGCTTCTTGGTGGCATAATTTCTGGCCTTGTTGTAGAAGCTCAGAGAAGGCTCCATCTCCAGCTTGATGCCGGTCAGCCGGGCAGAGAACTCGGGGTCCACCTCGTTGGACTCATCCACGGCAAACCAGTCCAGCAGGTGGTACAGGCCCAGCAGGCTGTCCAGCTGAGACTTCAGGATCTCCTTCTCCTCCTGCTTCTTCAGGGTTGTAGGCAGTGGCTGATCCAGGGCGGCGTGTGCGTGGGACAGGATCTCGCTGGTTTTCTGCTTGAAGGCCTCGCTCAGCTCCTTGCCTGCGGCAGAGATGATCTCCTGCAGGTTGATATCCTCGTGCTTCAGGCTGCGCTGCACCTTCTCCTTGGCAGACTTGGTGATCTTGCCTGTCAGCTCGGAGATTCTCCGCTCATACAGGGCATTCCTCAGTGTATCCCAGTGGTCGCACAGGGCGCTGCTGATTGTCTCCAGCTTCTTGTGGCTGATGAAGATGTGTGTCAGGTCGATGCTGTTCAGCTCGTTAAACAGGGCCTCGGCTGTCTCCAGCACGTTCTCGTTTCTCAGCAGTGTCTTGTACTTGCAGAAGGACTGGATCACTTCCTCGTCGCTCTTAAACTCCTCCAGGATGAAAGACAGGGTGTTCCTATCGGACAGGATCTGCTTAAACAGGGGGATGAATCTGTGTGGCAGGGAGGCGATGATGTGGGCTGTCTCATCATTCTTCTGGATGGCCAGATTCAGCACCTCGTTCAGGCCCTTGATCTTCTCGGTGCCTGCCTCCCGAGAGATTCCTCCCAGCAGCTGGTTATACAGGTCGATCTGGGTCTGTGTCAGCAGCTGGTTATAAAAAGGGAAGGAAAACACCTCCTCGATGGAGGTGCTCACGAAGATGCCGATGGCCTTCTTCACGTTCTCAAAGTGCTCCCGCAGGCTGGGCACGGCGGTGATCAGGCGTGTGAAGATGTGACAATTCTCCTTAAACTTGGGGAAGTTGTCCTGCACGATGCGGTGTGGGATGGCTGTGCTGATATCCTCGGCGCTGAACACGTTCTTCCTGTTCTCATAAAAGCCGGAGAAGTAGGTTGTAAACTTGTCGAAGCTCCGCAGCAGGGCGTTCTCGTGCTCGGTTGTGGTCACGGTGCCCAGCTGCTTCAGCACCTTGCCATTAAACAGCTCGGCCTTGAACAGGCCCTTGTAGATCTCGGCGTGTCTCTTATTGATGGCATCGGTCAGGTTGTCTGTCCGGCCGATGAAGTAGTCGTGGATGGCATTGCGATATGTGGCCTGCTCCTCGATCAGGGCGTTCCTTGTCTCCTCGGTTTTCTCCTTTCTATAGGAGTCGATGGCGGCGCTCAGGTTCTCCCAATCCAGCTGCACCAGCTGCAGGCACTGGTCGGCATAGGTCTTGTAGATCCGATCGATGATGGGCTTCAGCTCCTTGTAGTGATCATTGCGGGCCTTGTCCTCCTCGATGAAGCCCTGCTCCTGGATGTGCTTCAGGGTCTTGCCCTGTGGGATCAGCTCAAACCGCAGTGTCTTGCTCACCTGATACAGGTTGGTAAAGCCCTCGAACTGTGTCAT";
const sequence2 =
  "GTTGCGCAGCTCCTGGATGTAGGCCAGCCAGTCCTGATTGGAGATGCCGTTCTGCAGCTTCAGATCCTTGCTCTCCTTCAGGTGATTCAGCAGCAGCTGGCCCTTCAGGGCGATGTGGTAGGCGCCATTGGCATCGGCGTCCATGGGCCACTCTGGGTTCTGAAACCGGGAGTCGAAGCACACGCCATTCAGATCGCGCACGGGGCTGTTGATATAGTCCTCGCCTGTGGCGGCATTGGAGTTCCGCATCTGCAGCACGCTGCGGATCAGGGCCACCATGGTGTCGATGGCGTGAGAATCGTCATTCTCCAGCAGCTTTGGCAGGATGTTGGAGCCATCCCTGAACACGATGCCCTTCTCCTCCAGCAGGGCGATCAGCTCGTTGGCAGGATACAGGTCCCGGTATCTGCCGGTGAATCTGTGATTCTCGATCACTGGCACGATTCTCTTGCCGGCGATGAAAGGGGTGCCCTTGGCGTCAAACTGTGTCTCGTTCTTCTCGAACACGATATCCCATGCAGGCATAAAGCCGGGCAGGCCCCTCTGGAAGGACAGATTTCTGTTCATCTTAAAGTGCAGGATGAAGTCGCCGGTTTTCACGTCGTAGTGCAGAAAGTCGAAGCCCTCCAGGAAGTGCTTGCGGCTCTCGTGATTCTTGATGGTTTTCCACACGAAGGGGTCCACGAAGCCGGTCAGGGGATCGATCTTAGATGTATATGGGGCAGGCACGTAAAACAGGAAGCCAGACTGGGTGCCCATCTTGGCAAAGGAGGTGAACTGGTCTGTCAGCTGGTATGGGTTCAGCACGCCTCCCACTTTCTCTGCTGGATAGTCCTTCAGCACCAGGCAATTCAGCTTATCGATCAGCATCTTCTCGAACTGCTGGTACACGGCCTTCTCGGCGATGCCGGTCCTCTTGCTCTTAAAGCCGAAATTCAGGTTCTCCAGCACCACCACGGCCTGGTAGTGGATCATCAGGTCCACGATCTCGTGGATGACCTGGCTCAGATAGCCCTGCTTCAGATCCTTGATTGTGCCCACCACAGACCAGGCCTGCCTTGCTGCCACCCTCTCCTTCTCCCTGTTGTCCAGCTTCTTCTGGTAATCAAACTGCTGGATGGTGTTCAGGCTCCGCTGCTCCAGGATCTTGCCGGTGGAGTCGATCACTGTGATATAGATCAGGTTTCTCTCGCCCCGATCGATGCCGATGATAGGTGTCTCGGGGTGCTCCTTCAGGTAGGCATTCACCCTCTGGTTGAACTTAGATGGGGAATTGGCGGCCTGATAGTTCAGTGTGATAGGCACGTGGAAAAAGAACTTGTCGCTGGTAAAGCGCCTATCCTTGATGATCTCGTGAGACACCTCCTTGGTGATCACGTTGGGCAGCAGGGCCCTGGCCTCATCAGACAGGTCGTGGGACAGTCTGTGATTCACATAGTCGTACAGCTCCTGGTACAGGGTGTCGGGGATTGGGGTTTTCTGATCCTTCAGCTTCTTGTTCAGCATCTTCTCTCCCAGCCGGTGTGCCATCCTCTTCATCCTGGACTTAGGGCGGTAGAACAGCTCGGCCTGGCCATTCAGCTTGATGCTTGTCTTGGCCAGGTTCTCTGGAGAAAACAGGCCGGTCCAATACAGTGTGTGCAGATTAGGCTTGCCGTGGTGGCCCTTGGCAAAGTCCTTGTTATAGATCTGGAACAGGTACAGCTTGCCTGTCTCCACGGCATCCATGATCTCCTTCTCGGCGATTCTCTGGAAGCTGATGTGGTACAGCAGGGGATTCAGCTCGGCATAGTACTCGCCCAGGTCCTTATACTGAGAGGATGGCCGCAGGCTAGACAGATCGATAGAGGTTGTCTTGGTATACTTGGACAGAAAATCCCTTGTGAAGTCGATCCACTTGCACAGGGCCTCTCTGTAGCCCTTCTGGTCGCCGGTTTTCTTGGCGTAGGCTGTCTGAAACTTCTTTGGCTCCTTCTCAGGATTGTTCAGGTCGTAGATCTCCTTTGTGATCTCCAGAGGCTCGATGAAATTGTTGGACAGCAGGATGGGGGTTGTGTGGGTCTGAAAGTGGGCTGTCACGGCCTTCAGCTGGGTGCTGCACTTTGGGATCATCTTGGCGGCATCAGGGAAGTAGTCATAGTACATCTTATCAAAGCCCTCGCTGGTTTTCTCTGTGGGCTCGAAGCTCAGGGCCTTATACCTGCCCTTCTGCTTTGGCATGATGCCCAGATAGTACAGGCCGTTCTTCACAAACAGGATGGCGCCATTGTTCTTCTCCTTATTCACGTCCCAGCCAGAGGCCAGTGTAGGCATCTGAAAGTTCAGCTTGAACTTCTCCACGGAGTAGGGCTTCTTGGTGGCATAATTTCTGGCCTTGTTGTAGAAGCTCAGAGAAGGCTCCATCTCCAGCTTGATGCCGGTCAGCCGGGCAGAGAACTCGGGGTCCACCTCGTTGGACTCATCCACGGCAAACCAGTCCAGCAGGTGGTACAGGCCCAGCAGGCTGTCCAGCTGAGACTTCAGGATCTCCTTCTCCTCCTGCTTCTTCAGGGTTGTAGGCAGTGGCTGATCCAGGGCGGCGTGTGCGTGGGACAGGATCTCGCTGGTTTTCTGCTTGAAGGCCTCGCTCAGCTCCTTGCCTGCGGCAGAGATGATCTCCTGCAGGTTGATATCCTCGTGCTTCAGGCTGCGCTGCACCTTCTCCTTGGCAGACTTGGTGATCTTGCCTGTCAGCTCGGAGATTCTCCGCTCATACAGGGCATTCCTCAGTGTATCCCAGTGGTCGCACAGGGCGCTGCTGATTGTCTCCAGCTTCTTGTGGCTGATGAAGATGTGTGTCAGGTCGATGCTGTTCAGCTCGTTAAACAGGGCCTCGGCTGTCTCCAGCACGTTCTCGTTTCTCAGCAGTGTCTTGTACTTGCAGAAGGACTGGATCACTTCCTCGTCGCTCTTAAACTCCTCCAGGATGAAAGACAGGGTGTTCCTATCGGACAGGATCTGCTTAAACAGGGGGATGAATCTGTGTGGCAGGGAGGCGATGATGTGGGCTGTCTCATCATTCTTCTGGATGGCCAGATTCAGCACCTCGTTCAGGCCCTTGATCTTCTCGGTGCCTGCCTCCCGAGAGATTCCTCCCAGCAGCTGGTTATACAGGTCGATCTGGGTCTGTGTCAGCAGCTGGTTATAAAAAGGGAAGGAAAACACCTCCTCGATGGAGGTGCTCACGAAGATGCCGATGGCCTTCTTCACGTTCTCAAAGTGCTCCCGCAGGCTGGGCACGGCGGTGATCAGGCGTGTGAAGATGTGACAATTCTCCTTAAACTTGGGGAAGTTGTCCTGCACGATGCGGTGTGGGATGGCTGTGCTGATATCCTCGGCGCTGAACACGTTCTTCCTGTTCTCATAAAAGCCGGAGAAGTAGGTTGTAAACTTGTCGAAGCTCCGCAGCAGGGCGTTCTCGTGCTCGGTTGTGGTCACGGTGCCCAGCTGCTTCAGCACCTTGCCATTAAACAGCTCGGCCTTGAACAGGCCCTTGTAGATCTCGGCGTGTCTCTTATTGATGGCATCGGTCAGGTTGTCTGTCCGGCCGATGAAGTAGTCGTGGATGGCATTGCGATATGTGGCCTGCTCCTCGATCAGGGCGTTCCTTGTCTCCTCGGTTTTCTCCTTTCTATAGGAGTCGATGGCGGCGCTCAGGTTCTCCCAATCCAGCTGCACCAGCTGCAGGCACTGGTCGGCATAGGTCTTGTAGATCCGATCGATGATGGGCTTCAGCTCCTTGTAGTGATCATTGCGGGCCTTGTCCTCCTCGATGAAGCCCTGCTCCTGGATGTGCTTCAGGGTCTTGCCCTGTGGGATCAGCTCAAACCGCAGTGTCTTGCTCACCTGATACAGGTTGGTAAAGCCCTCGAACTGTGTCAT";
const validatedSequences = [sequence1, sequence2].map((seq) =>
  seq.split("")
) as ValidatedSequence[];
export const annotatedSequences = validatedSequences.map((seq) =>
  getAnnotatedSequence(seq, [])
);
