-module(task_queue).
-export([new/0, add/2, complete/2, pending/1, summary/1, main/0]).

new() ->
    [#{id => 1, title => <<"Review changes">>, done => false},
     #{id => 2, title => <<"Publish package">>, done => false}].

add(Tasks, Title) ->
    CleanTitle = string:trim(Title),
    case CleanTitle of
        [] -> Tasks;
        _ -> Tasks ++ [#{id => length(Tasks) + 1,
                         title => list_to_binary(CleanTitle), done => false}]
    end.

complete([], _Id) -> {error, not_found};
complete([Task | Rest], Id) ->
    case maps:get(id, Task) of
        Id -> {ok, [Task#{done => true} | Rest]};
        _ ->
            case complete(Rest, Id) of
                {ok, Updated} -> {ok, [Task | Updated]};
                Error -> Error
            end
    end.

pending(Tasks) -> [Task || Task <- Tasks, not maps:get(done, Task)].

summary(Tasks) ->
    Completed = length(Tasks) - length(pending(Tasks)),
    io_lib:format("~B pending, ~B complete", [length(pending(Tasks)), Completed]).

main() ->
    Tasks = new(),
    {ok, Completed} = complete(Tasks, 1),
    Expanded = add(Completed, "Write documentation"),
    io:format("~s~n", [summary(Expanded)]),
    lists:foreach(fun(Task) -> io:format("- ~s~n", [maps:get(title, Task)]) end,
                  pending(Expanded)).
