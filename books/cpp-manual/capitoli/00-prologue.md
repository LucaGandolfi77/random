# Prologue — Why This Manual Exists (And Why You're Reading It at 3 AM)

**Words:** ~950

---

There are only two kinds of languages: the ones people complain about and the ones nobody uses. Bjarne Stroustrup said that, and he was talking about C++, and he was right, and he was also describing his own life: thirty-odd years of being complained about, by people who use his language every day, to write everything you have ever touched that loads faster than a second.

This manual exists because the other manuals don't tell you the truth. The other manuals tell you that C++ is a systems language with manual memory management and a rich template system, and then they show you a linked list, and then you put the manual down and go and write Python, and Python is fine, and ten years later you are at a conference and someone says the word "latency" and you feel something move in your chest, and that thing is C++, calling.

This manual tells you the truth, which is this: C++ is the language of everything that matters, and everything that matters is written in C++, and the people who write it complain about it constantly, and they will never stop, and they will never leave. It is a marriage. You complain about C++ the way you complain about a spouse of thirty years: with specificity, with love, and with the quiet knowledge that the alternative is loneliness in a nicer apartment.

You are reading this at 3 AM. I know this because there are only three kinds of people who read C++ manuals: the students, who read them because they must; the professionals, who read them because something broke; and the 3 AM people, who read them because the build failed at 2:47 and the error message was four thousand lines long and somewhere in the middle of the fourth thousand lines, buried like a treasure in a landfill, was the actual problem, which was a missing semicolon on line 41 of a file called `utils_old_v2_FINAL.h`, and you fixed it, and it compiled, and you felt something that no other profession gives you: the feeling of having appeased a god.

This manual is for all three of you. It starts catchy, because the first day of C++ is the day you write `cout << "Hello, World!"` and it works and you feel like a god yourself. It gets technical, because the second day of C++ is the day you meet the linker, and the linker doesn't love you. And it ends in the future, because the future of C++ is the only future in computing that is genuinely hard to predict: the language has survived the death of everything around it — the operating systems, the hardware architectures, the fashions, the frameworks — and it will survive the death of us, and the last program that compiles, at the end of the universe, will be a C++ program, and it will have a template error, and someone, somewhere, in the last second of existence, will fix the semicolon.

Here is what this manual promises you, and here is what it delivers:

1. **Accuracy.** Every code sample in this book compiles, with `-Wall -Wextra -Werror`, on a modern compiler (GCC 13+, Clang 16+, or MSVC 19.30+). Every quote is real and attributed. Every claim about the standard is checked against the actual ISO document, or is clearly marked as a joke, which — in C++ — is the only way to mark a claim about the standard.
2. **Commitment.** This manual is prolix, as promised. C++ is a prolix language. The error messages are prolix. The standard is prolix: the last one was two thousand pages, and the committee is working on the next one, which will be longer, and somewhere in those two thousand pages is a sentence that says the thing that makes your program do the thing it does at 3 AM, and nobody has read it, and it is still true.
3. **Fun.** C++ is fun the way chess is fun: it is fun once you are losing, because losing at chess is losing at chess, and losing at C++ is a segfault, and a segfault is the most honest thing in computing. The segment fault does not lie. The segment fault says: *you, here, this line, this memory*. No other error in computing is this honest. Python will give you a traceback and a shrug. Java will give you an exception and a committee meeting. C++ gives you the address, the line, and the silence — and the silence is where you do your best work.

One last thing, before we begin. Alan Perlis said: "A language that doesn't affect the way you think about programming is not worth knowing." C++ will affect the way you think about programming. It will affect the way you think about memory, about time, about the difference between a value and an object, about what it means for something to exist. You will never look at a variable the same way again. You will see the boxes, and you will know the boxes lie, and you will love them anyway.

That is the marriage. Welcome to it.

---

*A note on the quotations: every quotation in this manual is real and attributed, except the ones that aren't, which are marked as jokes, which — in C++ — is the only way to mark anything.*
